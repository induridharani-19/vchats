import { Response, NextFunction } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import Media from '../models/Media';
import User from '../models/User';
import Reaction from '../models/Reaction';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';
import { Server } from 'socket.io';

// Helper to determine media type
const getMediaType = (fileName: string, mimeType?: string): 'image' | 'video' | 'audio' | 'document' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'].includes(ext)) return 'document';
  
  if (ext === 'webm') {
    if (mimeType && mimeType.startsWith('audio')) return 'audio';
    return 'video';
  }
  return 'document';
};

// Send Message handler
export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, content, type, replyTo, location, contactCard, disappearingTime, scheduledFor } = req.body;
    const userId = req.user?._id;

    if (!conversationId) {
      return next(new AppError('Conversation ID is required.', 400));
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    let fileUrl = undefined;
    let fileName = undefined;
    let fileSize = undefined;
    let computedType = type || 'text';

    // Handle Uploaded File
    if (req.file) {
      fileName = req.file.originalname;
      fileSize = req.file.size;
      computedType = getMediaType(fileName, req.file.mimetype);

      const result = await uploadToCloudinary(req.file.path, 'attachments', computedType === 'document' ? 'raw' : computedType === 'video' ? 'video' : 'image');
      fileUrl = result.url;
    }

    // Check custom types
    let messageContent = content || '';
    if (computedType === 'location' && location) {
      messageContent = typeof location === 'string' ? location : JSON.stringify(location);
    } else if (computedType === 'contact' && contactCard) {
      messageContent = typeof contactCard === 'string' ? contactCard : JSON.stringify(contactCard);
    }

    // Ephemeral / Disappearing message settings
    const isDisappearing = !!disappearingTime;
    const disappearsAt = disappearingTime
      ? new Date(Date.now() + parseInt(disappearingTime, 10) * 1000)
      : undefined;

    // Check if scheduled
    const isScheduled = scheduledFor && new Date(scheduledFor).getTime() > Date.now();
    const scheduledDate = isScheduled ? new Date(scheduledFor) : undefined;

    // Create message
    let message = await Message.create({
      conversationId,
      senderId: userId,
      content: messageContent,
      type: computedType,
      fileUrl,
      fileName,
      fileSize,
      replyTo: replyTo || undefined,
      isDisappearing,
      disappearsAt,
      scheduledFor: scheduledDate,
      seenBy: [{ userId, time: new Date() }],
    });

    // Populate Sender details
    message = await message.populate('senderId', 'username displayName profilePhoto');
    if (replyTo) {
      message = await message.populate({
        path: 'replyTo',
        populate: {
          path: 'senderId',
          select: 'username displayName',
        },
      });
    }

    if (!isScheduled) {
      // Update Conversation Last Message
      conversation.lastMessage = message._id as any;

      // Update Unread Counts for other participants
      conversation.participants.forEach((participantId) => {
        const pStr = participantId.toString();
        if (pStr !== userId.toString()) {
          const count = conversation.unreadCounts.get(pStr) || 0;
          conversation.unreadCounts.set(pStr, count + 1);
        }
      });

      await conversation.save();

      // Catalog Media attachment in DB if applicable
      if (fileUrl && fileName && fileSize) {
        await Media.create({
          userId,
          conversationId,
          messageId: message._id,
          fileUrl,
          fileName,
          fileType: computedType,
          fileSize,
        });
      }

      // Emit via Socket.io
      const io: Server = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('message-receive', message);
        
        // Send conversation list update broadcast (fully populated)
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

    res.status(201).json({
      status: 'success',
      message,
    });
  } catch (error) {
    next(error);
  }
};

// Edit message
export const editMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const message = await Message.findById(id);
    if (!message) {
      return next(new AppError('Message not found.', 404));
    }

    if (message.senderId.toString() !== userId.toString()) {
      return next(new AppError('You can only edit your own messages.', 403));
    }

    if (message.deletedForEveryone) {
      return next(new AppError('Cannot edit a deleted message.', 400));
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populated = await message.populate('senderId', 'username displayName profilePhoto');

    const io: Server = req.app.get('io');
    if (io) {
      io.to(message.conversationId.toString()).emit('message-edit', populated);
    }

    res.status(200).json({
      status: 'success',
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete message for me
export const deleteMessageForMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(id);
    if (!message) {
      return next(new AppError('Message not found.', 404));
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Message deleted for you.',
    });
  } catch (error) {
    next(error);
  }
};

// Delete message for everyone
export const deleteMessageForEveryone = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(id);
    if (!message) {
      return next(new AppError('Message not found.', 404));
    }

    if (message.senderId.toString() !== userId.toString()) {
      return next(new AppError('You can only delete your own messages.', 403));
    }

    message.content = 'This message was deleted.';
    message.deletedForEveryone = true;
    message.fileUrl = undefined;
    message.fileName = undefined;
    message.fileSize = undefined;
    await message.save();

    const populated = await message.populate('senderId', 'username displayName profilePhoto');

    const io: Server = req.app.get('io');
    if (io) {
      io.to(message.conversationId.toString()).emit('message-delete', populated);
    }

    res.status(200).json({
      status: 'success',
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Emoji Reaction on Message
export const toggleReaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user?._id;

    if (!emoji) {
      return next(new AppError('Emoji reaction is required.', 400));
    }

    const message = await Message.findById(id);
    if (!message) {
      return next(new AppError('Message not found.', 404));
    }

    // Check if reaction already exists from this user
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    let reactionType = 'reaction-add';
    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        // Remove reaction (toggle off)
        message.reactions.splice(existingIndex, 1);
        await Reaction.deleteOne({ messageId: id, userId });
        reactionType = 'reaction-remove';
      } else {
        // Update reaction emoji
        message.reactions[existingIndex].emoji = emoji;
        await Reaction.findOneAndUpdate({ messageId: id, userId }, { emoji });
      }
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
      await Reaction.create({ messageId: id, userId, emoji });
    }

    await message.save();
    const populated = await message.populate('senderId', 'username displayName profilePhoto');

    const io: Server = req.app.get('io');
    if (io) {
      io.to(message.conversationId.toString()).emit(reactionType, {
        messageId: id,
        conversationId: message.conversationId,
        reactions: message.reactions,
      });
    }

    res.status(200).json({
      status: 'success',
      reactions: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

// Search message history in a conversation
export const searchMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { query } = req.query;
    const userId = req.user?._id;

    if (!query || typeof query !== 'string') {
      return next(new AppError('Search query parameter is required.', 400));
    }

    // Verify user participates in the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return next(new AppError('Conversation not found or access denied.', 404));
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
      deletedForEveryone: false,
      content: { $regex: query, $options: 'i' },
    })
      .populate('senderId', 'username displayName profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all messages in a conversation as seen
export const markConversationAsSeen = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    // Find all messages in this conversation not sent by me and not seen by me
    const messagesToUpdate = await Message.find({
      conversationId,
      senderId: { $ne: userId },
      'seenBy.userId': { $ne: userId }
    });

    const messageIds = messagesToUpdate.map(m => m._id);

    if (messageIds.length > 0) {
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $push: { seenBy: { userId, time: new Date() } } }
      );

      // Reset unread count for current user
      const conversation = await Conversation.findById(conversationId);
      if (conversation && conversation.unreadCounts && conversation.unreadCounts.has(userId.toString())) {
        conversation.unreadCounts.set(userId.toString(), 0);
        await conversation.save();
      }

      // Emit socket notification
      const io: Server = req.app.get('io');
      if (io) {
        io.to(conversationId).emit('messages-seen', {
          conversationId,
          userId,
          messageIds
        });
        
        if (conversation) {
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
    }

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as seen.'
    });
  } catch (error) {
    next(error);
  }
};
