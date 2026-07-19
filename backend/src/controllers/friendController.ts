import { Response, NextFunction } from 'express';
import User from '../models/User';
import FriendRequest from '../models/FriendRequest';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Server } from 'socket.io';

// Send friend request
export const sendFriendRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { identifier } = req.body; // username or email
    const senderId = req.user?._id;

    if (!identifier) {
      return next(new AppError('Username or email is required.', 400));
    }

    // Find target user
    const receiver = await User.findOne({
      $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
    });

    if (!receiver) {
      return next(new AppError('User not found.', 404));
    }

    if (receiver._id.toString() === senderId.toString()) {
      return next(new AppError('You cannot send a friend request to yourself.', 400));
    }

    // Check if blocked by target or vice versa
    if (receiver.blockedUsers.includes(senderId) || req.user?.blockedUsers.includes(receiver._id)) {
      return next(new AppError('Action forbidden.', 403));
    }

    // Check if already friends
    const user = await User.findById(senderId);
    if (user && user.friends.includes(receiver._id)) {
      return next(new AppError('You are already friends with this user.', 400));
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id },
        { sender: receiver._id, receiver: senderId },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return next(new AppError('A pending friend request already exists between you.', 400));
      }
      // If rejected, allow resending by resetting status to pending
      existingRequest.status = 'pending';
      existingRequest.sender = senderId;
      existingRequest.receiver = receiver._id;
      await existingRequest.save();
    } else {
      // Create new request
      await FriendRequest.create({
        sender: senderId,
        receiver: receiver._id,
      });
    }

    // Notify receiver via socket
    const io: Server = req.app.get('io');
    if (io) {
      io.to(receiver._id.toString()).emit('friend-request-received', {
        sender: {
          id: req.user?._id,
          username: req.user?.username,
          displayName: req.user?.displayName,
          profilePhoto: req.user?.profilePhoto,
        },
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Friend request sent successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Respond to friend request (accept/reject)
export const respondToFriendRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { requestId, action } = req.body; // 'accepted' | 'rejected'
    const userId = req.user?._id;

    if (!requestId || !['accepted', 'rejected'].includes(action)) {
      return next(new AppError('Valid request ID and action (accepted/rejected) are required.', 400));
    }

    const request = await FriendRequest.findById(requestId);
    if (!request || request.receiver.toString() !== userId.toString()) {
      return next(new AppError('Friend request not found or unauthorized.', 404));
    }

    if (request.status !== 'pending') {
      return next(new AppError('Friend request has already been processed.', 400));
    }

    request.status = action;
    await request.save();

    if (action === 'accepted') {
      // Add each other as friends
      await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: userId } });
      await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.sender } });

      // Notify sender via socket
      const io: Server = req.app.get('io');
      if (io) {
        io.to(request.sender.toString()).emit('friend-request-accepted', {
          receiver: {
            id: req.user?._id,
            username: req.user?.username,
            displayName: req.user?.displayName,
            profilePhoto: req.user?.profilePhoto,
          },
        });
      }
    }

    // Delete request after handling to keep collection clean
    await FriendRequest.deleteOne({ _id: requestId });

    res.status(200).json({
      status: 'success',
      message: `Friend request ${action}.`,
    });
  } catch (error) {
    next(error);
  }
};

// Get pending friend requests
export const getFriendRequests = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    const requests = await FriendRequest.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'username displayName profilePhoto about')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      requests,
    });
  } catch (error) {
    next(error);
  }
};

// Fetch list of friends
export const getFriendsList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).populate('friends', 'username displayName profilePhoto about status lastSeen');
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      friends: user.friends,
    });
  } catch (error) {
    next(error);
  }
};

// Remove friend
export const removeFriend = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { friendId } = req.params;
    const userId = req.user?._id;

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    res.status(200).json({
      status: 'success',
      message: 'Friend removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
