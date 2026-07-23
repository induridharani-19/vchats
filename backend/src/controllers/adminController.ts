import { Response, NextFunction, Request } from 'express';
import User from '../models/User';
import Message from '../models/Message';
import Session from '../models/Session';
import Call from '../models/Call';
import Story from '../models/Story';
import Conversation from '../models/Conversation';
import SystemConfig from '../models/SystemConfig';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { Server } from 'socket.io';

// Fetch system stats for admin dashboard
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const onlineUsers = await User.countDocuments({ status: 'online' });

    const totalMessages = await Message.countDocuments();
    const totalCalls = await Call.countDocuments();
    const activeSessions = await Session.countDocuments({ isValid: true });

    // Last 7 days message counts for charts
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = await Message.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const recentCalls = await Call.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    res.status(200).json({
      status: 'success',
      stats: {
        totalUsers,
        verifiedUsers,
        blockedUsers,
        onlineUsers,
        totalMessages,
        totalCalls,
        activeSessions,
        recentStats: {
          messages: recentMessages,
          calls: recentCalls,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Fetch all users list (Paginated)
export const getUsersList = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    let query: any = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      users,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Ban / Unban user
export const toggleUserBlock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetUserId } = req.body;

    if (targetUserId === req.user?._id.toString()) {
      return next(new AppError('You cannot ban yourself.', 400));
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    user.isBlocked = !user.isBlocked;
    if (user.isBlocked) {
      user.status = 'offline';
    }
    await user.save();

    // If blocked, invalidate all active sessions instantly
    if (user.isBlocked) {
      await Session.updateMany({ userId: user._id, isValid: true }, { isValid: false });
      
      // Force disconnect user's sockets if online
      const io: Server = req.app.get('io');
      if (io) {
        io.to(targetUserId.toString()).emit('force-logout', {
          reason: 'Your account has been suspended by the administrator.',
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: user.isBlocked ? 'User has been banned.' : 'User has been unbanned.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
export const deleteUserAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetUserId } = req.params;

    if (targetUserId === req.user?._id.toString()) {
      return next(new AppError('You cannot delete your own account from the admin dashboard.', 400));
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // 1. Force socket disconnect
    const io: Server = req.app.get('io');
    if (io) {
      io.to(targetUserId).emit('force-logout', { reason: 'Your account was deleted by admin.' });
    }

    // 2. Delete User Sessions, Stories, Status, and OTPs
    await Session.deleteMany({ userId: targetUserId });
    await Story.deleteMany({ userId: targetUserId });
    await User.deleteOne({ _id: targetUserId });

    res.status(200).json({
      status: 'success',
      message: 'Account and associated session data deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Broadcast System announcement message to all users
export const broadcastAnnouncement = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, message } = req.body;

    if (!message) {
      return next(new AppError('Message body is required for broadcast.', 400));
    }

    // Emit system alert to all sockets
    const io: Server = req.app.get('io');
    if (io) {
      io.emit('system-broadcast', {
        title: title || 'System Announcement',
        message,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Announcement broadcasted to all active connections.',
    });
  } catch (error) {
    next(error);
  }
};

// Fetch public system configs (Branding & Ads)
export const getPublicConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({
        appName: 'VChats',
        accentColor: '#0d9488',
      });
    }

    res.status(200).json({
      status: 'success',
      config: {
        appName: config.appName,
        appLogo: config.appLogo,
        accentColor: config.accentColor,
        showAds: config.showAds,
        adImageUrl: config.adImageUrl,
        adTargetUrl: config.adTargetUrl,
        adText: config.adText,
        maintenanceMode: config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Fetch all system configs (Protected Admin)
export const getSystemConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }

    res.status(200).json({
      status: 'success',
      config,
    });
  } catch (error) {
    next(error);
  }
};

// Update system configs (Protected Admin)
export const updateSystemConfig = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const updateData = req.body;
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create(updateData);
    } else {
      Object.assign(config, updateData);
      await config.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'System configuration updated successfully.',
      config,
    });
  } catch (error) {
    next(error);
  }
};
