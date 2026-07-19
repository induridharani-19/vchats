import { Request, Response, NextFunction } from 'express';
import Channel from '../models/Channel';
import Message from '../models/Message';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// Create Channel
export const createChannel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, isPublic } = req.body;
    const ownerId = req.user?._id;

    if (!name) {
      return next(new AppError('Channel name is required.', 400));
    }

    // Check unique name
    const existing = await Channel.findOne({ name: name.toLowerCase() });
    if (existing) {
      return next(new AppError('Channel name is already taken.', 400));
    }

    let avatarUrl = '';
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.path, 'channels', 'image');
      avatarUrl = uploadResult.url;
    }

    const channel = await Channel.create({
      name: name.toLowerCase(),
      description: description || '',
      avatar: avatarUrl,
      owner: ownerId,
      followers: [ownerId], // Owner follows by default
      isPublic: isPublic === undefined ? true : isPublic === 'true' || isPublic === true,
    });

    res.status(201).json({
      status: 'success',
      channel,
    });
  } catch (error) {
    next(error);
  }
};

// Follow Channel
export const followChannel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channelId } = req.params;
    const userId = req.user?._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return next(new AppError('Channel not found.', 404));
    }

    if (channel.followers.includes(userId)) {
      return next(new AppError('You are already following this channel.', 400));
    }

    channel.followers.push(userId);
    await channel.save();

    res.status(200).json({
      status: 'success',
      message: 'You are now following this channel.',
      followersCount: channel.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

// Unfollow Channel
export const unfollowChannel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channelId } = req.params;
    const userId = req.user?._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return next(new AppError('Channel not found.', 404));
    }

    if (channel.owner.toString() === userId.toString()) {
      return next(new AppError('Owners cannot unfollow their own channels. Delete it instead.', 400));
    }

    const index = channel.followers.indexOf(userId);
    if (index === -1) {
      return next(new AppError('You are not following this channel.', 400));
    }

    channel.followers.splice(index, 1);
    await channel.save();

    res.status(200).json({
      status: 'success',
      message: 'You have unfollowed this channel.',
      followersCount: channel.followers.length,
    });
  } catch (error) {
    next(error);
  }
};

// Post Broadcast message (Owner only)
export const postToChannel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return next(new AppError('Channel not found.', 404));
    }

    if (channel.owner.toString() !== userId.toString()) {
      return next(new AppError('Only the channel owner can post broadcasts.', 403));
    }

    let fileUrl = undefined;
    let fileName = undefined;
    let fileSize = undefined;
    let type = 'text';

    if (req.file) {
      fileName = req.file.originalname;
      fileSize = req.file.size;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'image';
      else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
      else type = 'document';

      const result = await uploadToCloudinary(
        req.file.path,
        'channels',
        type === 'document' ? 'raw' : type === 'video' ? 'video' : 'image'
      );
      fileUrl = result.url;
    }

    // Create a Message document using the Channel ID as a conversation reference
    let message = await Message.create({
      conversationId: channel._id,
      senderId: userId,
      content: content || '',
      type,
      fileUrl,
      fileName,
      fileSize,
    });

    message = await message.populate('senderId', 'username displayName profilePhoto');

    // Emit Socket notification to channel room
    const io: Server = req.app.get('io');
    if (io) {
      io.to(channelId).emit('channel-broadcast', { channelId, message });
    }

    res.status(201).json({
      status: 'success',
      message,
    });
  } catch (error) {
    next(error);
  }
};

// Get channels list (filters: search / my channels / discover)
export const getChannels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, query } = req.query; // 'following' | 'discover' | 'created'
    const userId = req.user?._id;

    let filter: any = {};

    if (type === 'following') {
      filter = { followers: userId, owner: { $ne: userId } };
    } else if (type === 'created') {
      filter = { owner: userId };
    } else {
      // discover: public channels user is not currently following
      filter = { isPublic: true, followers: { $ne: userId } };
    }

    if (query && typeof query === 'string') {
      filter.name = { $regex: query, $options: 'i' };
    }

    const channels = await Channel.find(filter)
      .populate('owner', 'username displayName profilePhoto')
      .select('name description owner avatar followers isPublic createdAt')
      .limit(30);

    res.status(200).json({
      status: 'success',
      channels,
    });
  } catch (error) {
    next(error);
  }
};

// Get channel announcements
export const getChannelPosts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { channelId } = req.params;
    const userId = req.user?._id;
    const limit = parseInt(req.query.limit as string) || 30;
    const before = req.query.before as string;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return next(new AppError('Channel not found.', 404));
    }

    // Verify user follows channel if private
    if (!channel.isPublic && !channel.followers.includes(userId)) {
      return next(new AppError('Access denied. This is a private channel.', 403));
    }

    const query: any = {
      conversationId: channelId,
    };

    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const beforeMessage = await Message.findById(before);
      if (beforeMessage) {
        query.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const posts = await Message.find(query)
      .populate('senderId', 'username displayName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      posts: posts.reverse(),
    });
  } catch (error) {
    next(error);
  }
};
