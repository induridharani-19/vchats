import { Response, NextFunction } from 'express';
import Payment from '../models/Payment';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';

export const transferMoney = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user?._id;
    const { receiverId, amount, currency = 'USD', note = '' } = req.body;

    if (!receiverId || !amount || amount <= 0) {
      return next(new AppError('Recipient and valid payment amount are required.', 400));
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return next(new AppError('Recipient user not found.', 404));
    }

    const transactionId = 'VPAY-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

    const payment = await Payment.create({
      senderId,
      receiverId,
      amount,
      currency,
      status: 'completed',
      note,
      transactionId,
    });

    res.status(201).json({
      status: 'success',
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;

    const payments = await Payment.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username displayName profilePhoto')
      .populate('receiverId', 'username displayName profilePhoto');

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
};
