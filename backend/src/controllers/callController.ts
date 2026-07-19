import { Response, NextFunction } from 'express';
import Call from '../models/Call';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';

// Fetch call logs
export const getCallHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    // Find conversations the user belongs to for group call mapping
    const Conversation = require('../models/Conversation').default;
    const userConvs = await Conversation.find({ participants: userId }).select('_id');
    const convIds = userConvs.map((c: any) => c._id);

    const calls = await Call.find({
      $or: [
        { callerId: userId },
        { receiverId: userId },
        { conversationId: { $in: convIds } }
      ],
      deletedFor: { $ne: userId },
    })
      .populate('callerId', 'username displayName profilePhoto')
      .populate('receiverId', 'username displayName profilePhoto')
      .populate({
        path: 'conversationId',
        select: 'type groupId',
        populate: {
          path: 'groupId',
          select: 'name avatar'
        }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: 'success',
      calls,
    });
  } catch (error) {
    next(error);
  }
};

// Create a Call log record
export const createCallRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receiverId, type, status, duration, startedAt, endedAt, conversationId } = req.body;
    const callerId = req.user?._id;

    const call = await Call.create({
      conversationId: conversationId || undefined,
      callerId,
      receiverId: receiverId || undefined,
      type,
      status: status || 'initiated',
      duration: duration || 0,
      startedAt: startedAt || new Date(),
      endedAt: endedAt || undefined,
    });

    const populated = await call.populate([
      { path: 'callerId', select: 'username displayName profilePhoto' },
      { path: 'receiverId', select: 'username displayName profilePhoto' }
    ]);

    res.status(201).json({
      status: 'success',
      call: populated,
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing Call log
export const updateCallRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, duration, endedAt } = req.body;

    const call = await Call.findById(id);
    if (!call) {
      return next(new AppError('Call log not found.', 404));
    }

    if (status) call.status = status;
    if (duration !== undefined) call.duration = duration;
    if (endedAt) call.endedAt = new Date(endedAt);

    await call.save();

    res.status(200).json({
      status: 'success',
      call,
    });
  } catch (error) {
    next(error);
  }
};

// Delete single call log for user
export const deleteCallRecord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const call = await Call.findById(id);
    if (!call) {
      return next(new AppError('Call log not found.', 404));
    }

    if (call.deletedFor && !call.deletedFor.includes(userId)) {
      call.deletedFor.push(userId);
      await call.save();
    } else if (!call.deletedFor) {
      call.deletedFor = [userId];
      await call.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Call log deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// Clear entire call history for user
export const clearCallHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const Conversation = require('../models/Conversation').default;
    const userConvs = await Conversation.find({ participants: userId }).select('_id');
    const convIds = userConvs.map((c: any) => c._id);

    await Call.updateMany(
      {
        $or: [
          { callerId: userId },
          { receiverId: userId },
          { conversationId: { $in: convIds } }
        ],
        deletedFor: { $ne: userId }
      },
      {
        $addToSet: { deletedFor: userId }
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Call history cleared.',
    });
  } catch (error) {
    next(error);
  }
};
