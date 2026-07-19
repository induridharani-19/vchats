import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';

// Get profile of current logged-in user
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).populate('blockedUsers', 'username displayName profilePhoto');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Update profile details
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { displayName, about, bio, themePreference, twoFactorEnabled, status } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (displayName) user.displayName = displayName;
    if (about !== undefined) user.about = about;
    if (bio !== undefined) user.bio = bio;
    if (themePreference) user.themePreference = themePreference;
    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
    if (status) user.status = status;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        about: user.about,
        bio: user.bio,
        status: user.status,
        themePreference: user.themePreference,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Upload to Cloudinary (or local mock fallback)
    const result = await uploadToCloudinary(req.file.path, 'avatars', 'image');

    user.profilePhoto = result.url;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile photo uploaded successfully',
      profilePhoto: result.url,
    });
  } catch (error) {
    next(error);
  }
};

// Search users by username or display name
export const searchUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      res.status(200).json({ status: 'success', users: [] });
      return;
    }

    // Search for matches in username or display name, excluding self and inactive users
    const users = await User.find({
      _id: { $ne: req.user?._id },
      isVerified: true,
      isBlocked: false,
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } },
      ],
    })
      .select('username displayName profilePhoto about status lastSeen')
      .limit(20);

    res.status(200).json({
      status: 'success',
      users,
    });
  } catch (error) {
    next(error);
  }
};

// Block a user
export const blockUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetUserId } = req.body;

    if (targetUserId === req.user?._id.toString()) {
      return next(new AppError('You cannot block yourself.', 400));
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return next(new AppError('User to block not found.', 404));
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // Check if already blocked
    if (user.blockedUsers.includes(targetUserId)) {
      return next(new AppError('User is already blocked.', 400));
    }

    user.blockedUsers.push(targetUserId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User blocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Unblock a user
export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetUserId } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    const index = user.blockedUsers.indexOf(targetUserId);
    if (index === -1) {
      return next(new AppError('User is not blocked.', 400));
    }

    user.blockedUsers.splice(index, 1);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User unblocked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Set 4-digit lock PIN
export const setChatLockPin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4) {
      return next(new AppError('Lock PIN must be exactly 4 digits.', 400));
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    user.chatLockPin = pin;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Chat Lock PIN configured successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Verify 4-digit lock PIN
export const verifyChatLockPin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user?._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const isMatch = user.chatLockPin === pin;

    res.status(200).json({
      status: 'success',
      verified: isMatch,
    });
  } catch (error) {
    next(error);
  }
};

// Report a user or group
export const reportEntity = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetId, type, reason } = req.body;
    if (!targetId || !type || !reason) {
      return next(new AppError('Target ID, type (user/group), and reason are required.', 400));
    }

    console.log(`[REPORT] User ${req.user?._id} reported target ${targetId} (${type}) for: ${reason}`);

    res.status(200).json({
      status: 'success',
      message: 'Report submitted successfully. We will review this entity shortly.',
    });
  } catch (error) {
    next(error);
  }
};

