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

    const calls = await Call.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .populate('callerId', 'username displayName profilePhoto')
      .populate('receiverId', 'username displayName profilePhoto')
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

    if (!receiverId) {
      return next(new AppError('Receiver ID is required.', 400));
    }

    const call = await Call.create({
      conversationId: conversationId || undefined,
      callerId,
      receiverId,
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

// Update an existing Call log (e.g. set status=ended, set duration)
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
