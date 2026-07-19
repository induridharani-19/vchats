import { Response, NextFunction } from 'express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import Group from '../models/Group';
import GroupMember from '../models/GroupMember';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

// Fetch all conversations for the logged-in user
export const getConversations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
      .populate({
        path: 'groupId',
        model: 'Group',
        populate: {
          path: 'creator',
          select: 'username displayName',
        },
      })
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// Create or retrieve 1-to-1 conversation
export const createDirectConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user?._id;

    if (!targetUserId) {
      return next(new AppError('Target user ID is required.', 400));
    }

    if (userId.toString() === targetUserId) {
      return next(new AppError('You cannot start a conversation with yourself.', 400));
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return next(new AppError('Target user not found.', 404));
    }

    // Check if user is blocked by target user or vice versa
    if (targetUser.blockedUsers.includes(userId)) {
      return next(new AppError('You have been blocked by this user.', 403));
    }
    if (req.user?.blockedUsers.includes(targetUserId)) {
      return next(new AppError('Please unblock this user before messaging them.', 403));
    }

    // Check if direct conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [userId, targetUserId] },
    })
      .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
      .populate('lastMessage');

    if (!conversation) {
      // Create new direct conversation
      conversation = await Conversation.create({
        type: 'direct',
        participants: [userId, targetUserId],
        unreadCounts: new Map([
          [userId.toString(), 0],
          [targetUserId.toString(), 0],
        ]),
      });

      conversation = await conversation.populate('participants', 'username displayName profilePhoto status lastSeen email bio about');
    }

    res.status(200).json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Pin Conversation
export const togglePinConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404));
    }

    const index = conversation.pinnedBy.indexOf(userId);
    if (index === -1) {
      conversation.pinnedBy.push(userId);
    } else {
      conversation.pinnedBy.splice(index, 1);
    }

    await conversation.save();

    res.status(200).json({
      status: 'success',
      message: index === -1 ? 'Conversation pinned.' : 'Conversation unpinned.',
      pinned: index === -1,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Mute Conversation
export const toggleMuteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404));
    }

    const index = conversation.mutedBy.indexOf(userId);
    if (index === -1) {
      conversation.mutedBy.push(userId);
    } else {
      conversation.mutedBy.splice(index, 1);
    }

    await conversation.save();

    res.status(200).json({
      status: 'success',
      message: index === -1 ? 'Conversation muted.' : 'Conversation unmuted.',
      muted: index === -1,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Favorite Conversation
export const toggleFavoriteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404));
    }

    const index = conversation.favorites.indexOf(userId);
    if (index === -1) {
      conversation.favorites.push(userId);
    } else {
      conversation.favorites.splice(index, 1);
    }

    await conversation.save();

    res.status(200).json({
      status: 'success',
      message: index === -1 ? 'Conversation added to favorites.' : 'Conversation removed from favorites.',
      favorite: index === -1,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Archive Conversation
export const toggleArchiveConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404));
    }

    const index = conversation.archivedBy.indexOf(userId);
    if (index === -1) {
      conversation.archivedBy.push(userId);
    } else {
      conversation.archivedBy.splice(index, 1);
    }

    await conversation.save();

    res.status(200).json({
      status: 'success',
      message: index === -1 ? 'Conversation archived.' : 'Conversation unarchived.',
      archived: index === -1,
    });
  } catch (error) {
    next(error);
  }
};

// Get Messages in Conversation (Paginated)
export const getConversationMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 30;
    const before = req.query.before as string; // Message ID for cursor pagination

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    // Build query
    const query: any = {
      conversationId,
      deletedFor: { $ne: userId },
    };

    // Cursor-based pagination for smooth scrolling
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('senderId', 'username displayName profilePhoto')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Reset unread count for current user
    if (conversation.unreadCounts && conversation.unreadCounts.has(userId.toString())) {
      conversation.unreadCounts.set(userId.toString(), 0);
      await conversation.save();
    }

    // Mark retrieved messages as seen by current user
    const unreadMessagesIds = messages
      .filter((m) => {
        const isSelf = m.senderId.toString() === userId.toString();
        const alreadySeen = m.seenBy?.some((s) => s.userId.toString() === userId.toString());
        return !isSelf && !alreadySeen;
      })
      .map((m) => m._id);

    if (unreadMessagesIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: unreadMessagesIds } },
        { $push: { seenBy: { userId, time: new Date() } } }
      );
      
      const io: Server = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('messages-seen', {
          conversationId,
          userId,
          messageIds: unreadMessagesIds,
        });
      }
    }

    res.status(200).json({
      status: 'success',
      messages: messages.reverse(), // Send in chronological order
    });
  } catch (error) {
    next(error);
  }
};

// Delete a conversation and all its messages
export const deleteConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    // Delete all messages in this conversation
    await Message.deleteMany({ conversationId });

    // If it is a group, delete the Group & members as well
    if (conversation.type === 'group' && conversation.groupId) {
      await Group.findByIdAndDelete(conversation.groupId);
      await GroupMember.deleteMany({ groupId: conversation.groupId });
    }

    await Conversation.findByIdAndDelete(conversationId);

    // Notify clients via socket
    const io: Server = req.app.get('io');
    if (io) {
      io.emit('conversation-deleted', conversationId);
    }

    res.status(200).json({
      status: 'success',
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Update custom color theme or background wallpaper for the conversation
export const updateConversationTheme = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { themeColor, themeImage } = req.body;
    const userId = req.user?._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    if (themeColor !== undefined) conversation.themeColor = themeColor;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, 'themes', 'image');
      conversation.themeImage = result.url;
    } else if (themeImage !== undefined) {
      conversation.themeImage = themeImage;
    }
    await conversation.save();

    const populated = await conversation.populate([
      { path: 'participants', select: 'username displayName profilePhoto status lastSeen email bio about' },
      { path: 'groupId', model: 'Group' },
      {
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      }
    ]);

    const io: Server = req.app.get('io');
    if (io) {
      io.emit('conversation-theme-update', {
        conversationId,
        themeColor: conversation.themeColor,
        themeImage: conversation.themeImage,
      });
    }

    res.status(200).json({
      status: 'success',
      conversation: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Clear custom theme and background image
export const clearConversationTheme = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    conversation.themeColor = '';
    conversation.themeImage = '';
    await conversation.save();

    const populated = await conversation.populate([
      { path: 'participants', select: 'username displayName profilePhoto status lastSeen email bio about' },
      { path: 'groupId', model: 'Group' },
      {
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      }
    ]);

    const io: Server = req.app.get('io');
    if (io) {
      io.emit('conversation-theme-update', {
        conversationId,
        themeColor: '',
        themeImage: '',
      });
    }

    res.status(200).json({
      status: 'success',
      conversation: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Lock Conversation
export const toggleLockConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('User not authenticated.', 401));
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return next(new AppError('Conversation not found.', 404));
    }

    if (!conversation.lockedBy) {
      conversation.lockedBy = [userId];
    } else {
      const idx = conversation.lockedBy.indexOf(userId);
      if (idx === -1) {
        conversation.lockedBy.push(userId);
      } else {
        conversation.lockedBy.splice(idx, 1);
      }
    }

    await conversation.save();

    res.status(200).json({
      status: 'success',
      message: conversation.lockedBy.includes(userId) ? 'Chat locked.' : 'Chat unlocked.',
      locked: conversation.lockedBy.includes(userId),
    });
  } catch (error) {
    next(error);
  }
};

// Clear all messages in a conversation for the user
export const clearConversation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('User not authenticated.', 401));
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    // Add userId to deletedFor for all messages in this conversation
    await Message.updateMany(
      { conversationId, deletedFor: { $ne: userId } },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({
      status: 'success',
      message: 'Chat cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
};

