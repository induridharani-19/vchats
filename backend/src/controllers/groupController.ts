import { Response, NextFunction } from 'express';
import Group from '../models/Group';
import GroupMember from '../models/GroupMember';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';
import { Server } from 'socket.io';

// Create Group
export const createGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, memberIds } = req.body;
    const creatorId = req.user?._id;

    if (!name) {
      return next(new AppError('Group name is required.', 400));
    }

    let parsedMembers: string[] = [];
    if (memberIds) {
      parsedMembers = typeof memberIds === 'string' ? JSON.parse(memberIds) : memberIds;
    }

    // Add creator to members list
    if (!parsedMembers.includes(creatorId.toString())) {
      parsedMembers.push(creatorId.toString());
    }

    let avatarUrl = '';
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'groups', 'image');
      avatarUrl = uploadResult.url;
    }

    // 1. Create Group Document
    const group = await Group.create({
      name,
      description: description || '',
      avatar: avatarUrl,
      creator: creatorId,
    });

    // 2. Create GroupMember records
    const memberPromises = parsedMembers.map((mId) => {
      return GroupMember.create({
        groupId: group._id,
        userId: mId,
        role: mId === creatorId.toString() ? 'admin' : 'member',
      });
    });
    await Promise.all(memberPromises);

    // 3. Create Conversation Document
    const conversation = await Conversation.create({
      type: 'group',
      participants: parsedMembers,
      groupId: group._id,
      unreadCounts: new Map(parsedMembers.map((mId) => [mId, 0])),
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username displayName profilePhoto status lastSeen')
      .populate({
        path: 'groupId',
        model: 'Group',
      });

    // Emit socket event to all members
    const io: Server = req.app.get('io');
    if (io) {
      parsedMembers.forEach((mId) => {
        io.to(mId).emit('group-created', populatedConversation);
      });
    }

    res.status(201).json({
      status: 'success',
      conversation: populatedConversation,
    });
  } catch (error) {
    next(error);
  }
};

// Add members to group
export const addGroupMembers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body; // Array of user IDs
    const currentUserId = req.user?._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found.', 404));
    }

    // Check if requester is Admin or Co-Admin
    const requesterMember = await GroupMember.findOne({ groupId, userId: currentUserId });
    if (!requesterMember || !['admin', 'co-admin'].includes(requesterMember.role)) {
      return next(new AppError('Only administrators can add members to this group.', 403));
    }

    const conversation = await Conversation.findOne({ groupId });
    if (!conversation) {
      return next(new AppError('Group conversation not found.', 404));
    }

    const targets = Array.isArray(memberIds) ? memberIds : [memberIds];

    for (const tId of targets) {
      // Check if user is already a member
      const exists = await GroupMember.findOne({ groupId, userId: tId });
      if (!exists) {
        await GroupMember.create({ groupId, userId: tId, role: 'member' });
        conversation.participants.push(tId);
        conversation.unreadCounts.set(tId.toString(), 0);
      }
    }

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username displayName profilePhoto status lastSeen')
      .populate('groupId');

    const io: Server = req.app.get('io');
    if (io) {
      populatedConversation.participants.forEach((participant) => {
        io.to(participant._id.toString()).emit('conversation-update', populatedConversation);
      });
    }

    res.status(200).json({
      status: 'success',
      conversation: populatedConversation,
    });
  } catch (error) {
    next(error);
  }
};

// Remove Group Member
export const removeGroupMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user?._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found.', 404));
    }

    const requesterMember = await GroupMember.findOne({ groupId, userId: currentUserId });
    if (!requesterMember || !['admin', 'co-admin'].includes(requesterMember.role)) {
      return next(new AppError('Only administrators can remove members.', 403));
    }

    const targetMember = await GroupMember.findOne({ groupId, userId });
    if (!targetMember) {
      return next(new AppError('Target member is not in the group.', 404));
    }

    // Admin cannot be removed unless they transfer ownership, and co-admins can only be removed by admin
    if (targetMember.role === 'admin') {
      return next(new AppError('Ownership must be transferred before removing the main admin.', 400));
    }
    if (targetMember.role === 'co-admin' && requesterMember.role !== 'admin') {
      return next(new AppError('Co-admins can only be removed by the group creator/admin.', 403));
    }

    // Delete membership and update conversation
    await GroupMember.deleteOne({ _id: targetMember._id });

    const conversation = await Conversation.findOne({ groupId });
    if (conversation) {
      const idx = conversation.participants.indexOf(userId as any);
      if (idx > -1) {
        conversation.participants.splice(idx, 1);
      }
      conversation.unreadCounts.delete(userId);
      await conversation.save();

      const io: Server = req.app.get('io');
      if (io) {
        // Notify the removed member
        io.to(userId).emit('group-removed', { conversationId: conversation._id, groupId });
        
        // Notify other participants (fully populated)
        const populatedConversation = await Conversation.findById(conversation._id)
          .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'senderId',
              select: 'username displayName',
            },
          })
          .populate('groupId');

        if (populatedConversation) {
          populatedConversation.participants.forEach((p: any) => {
            const pId = p._id || p;
            io.to(pId.toString()).emit('conversation-update', populatedConversation);
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Member removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Group Admin Role (Admin or Co-Admin)
export const toggleGroupAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user?._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found.', 404));
    }

    // Only creator/main admin can promote to co-admin/admin
    const requesterMember = await GroupMember.findOne({ groupId, userId: currentUserId });
    if (!requesterMember || requesterMember.role !== 'admin') {
      return next(new AppError('Only the main administrator can configure roles.', 403));
    }

    const targetMember = await GroupMember.findOne({ groupId, userId });
    if (!targetMember) {
      return next(new AppError('Target user is not a group member.', 404));
    }

    // Toggle: if co-admin, make member. If member, make co-admin.
    targetMember.role = targetMember.role === 'co-admin' ? 'member' : 'co-admin';
    await targetMember.save();

    res.status(200).json({
      status: 'success',
      message: `User role updated to ${targetMember.role}.`,
      role: targetMember.role,
    });
  } catch (error) {
    next(error);
  }
};

// Leave Group
export const leaveGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = req.user?._id;

    const member = await GroupMember.findOne({ groupId, userId });
    if (!member) {
      return next(new AppError('You are not a member of this group.', 400));
    }

    if (member.role === 'admin') {
      return next(new AppError('As the group creator, you must delete the group or transfer admin rights before leaving.', 400));
    }

    await GroupMember.deleteOne({ _id: member._id });

    const conversation = await Conversation.findOne({ groupId });
    if (conversation) {
      const idx = conversation.participants.indexOf(userId);
      if (idx > -1) {
        conversation.participants.splice(idx, 1);
      }
      conversation.unreadCounts.delete(userId.toString());
      await conversation.save();

      const io: Server = req.app.get('io');
      if (io) {
        io.to(userId.toString()).emit('group-removed', { conversationId: conversation._id, groupId });
        const populatedConversation = await Conversation.findById(conversation._id)
          .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'senderId',
              select: 'username displayName',
            },
          })
          .populate('groupId');

        if (populatedConversation) {
          populatedConversation.participants.forEach((p: any) => {
            const pId = p._id || p;
            io.to(pId.toString()).emit('conversation-update', populatedConversation);
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'You have left the group.',
    });
  } catch (error) {
    next(error);
  }
};

// Edit / Update Group Details
export const updateGroup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user?._id;

    const membership = await GroupMember.findOne({ groupId, userId });
    if (!membership) {
      return next(new AppError('You are not a member of this group.', 403));
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return next(new AppError('Group not found.', 404));
    }

    if (group.settings?.restrictInfoEditing && membership.role !== 'admin' && membership.role !== 'co-admin') {
      return next(new AppError('Only admins can edit group details.', 403));
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;

    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'groups', 'image');
      group.avatar = result.url;
    }

    await group.save();

    const conversation = await Conversation.findOne({ groupId })
      .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
      .populate({
        path: 'groupId',
        model: 'Group',
      })
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      });

    if (conversation) {
      const io: Server = req.app.get('io');
      if (io) {
        conversation.participants.forEach((p: any) => {
          io.to(p._id.toString()).emit('conversation-update', conversation);
        });
      }
    }

    res.status(200).json({
      status: 'success',
      group,
    });
  } catch (error) {
    next(error);
  }
};
