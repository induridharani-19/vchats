import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User';
import OTP from '../models/OTP';
import Session from '../models/Session';
import Device from '../models/Device';
import { AppError } from '../utils/appError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { mailTransporter, emailFrom } from '../config/mail';
import { AuthenticatedRequest } from '../middlewares/auth';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate 6-digit numeric OTP
const generateNumericOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register handler
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.isVerified) {
        return next(new AppError('Username or email is already registered', 400));
      }
      // If user exists but is not verified, we can let them re-register (overwrite/reuse) or just resend OTP
      // For simplicity, we delete the unverified user and let them register fresh
      await User.deleteOne({ _id: existingUser._id });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create unverified user
    const newUser = await User.create({
      username,
      email,
      passwordHash,
      displayName,
      isVerified: false,
    });

    // Generate OTP
    const otp = generateNumericOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save OTP
    await OTP.deleteMany({ email, type: 'verification' }); // clear previous
    await OTP.create({
      email,
      otp: hashedOtp,
      type: 'verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10m expiry
    });

    // Send Email
    await mailTransporter.sendMail({
      from: emailFrom,
      to: email,
      subject: 'Verify Your VChats Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #00B69B; text-align: center;">Welcome to VChats!</h2>
          <p>Thank you for registering. Please verify your email using the OTP below:</p>
          <div style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; padding: 15px; background-color: #f5f5f5; color: #333; margin: 20px 0; border-radius: 4px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. Please do not share this code.</p>
        </div>
      `,
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration initiated. OTP sent to email.',
      email,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP handler
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, type } = req.body;

    const otpRecord = await OTP.findOne({ email, type });
    if (!otpRecord) {
      return next(new AppError('OTP expired or not found. Please request a new one.', 400));
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return next(new AppError('Incorrect OTP. Please check and try again.', 400));
    }

    if (type === 'verification') {
      const user = await User.findOne({ email });
      if (!user) {
        return next(new AppError('User not found.', 404));
      }
      user.isVerified = true;
      await user.save();
      await OTP.deleteOne({ _id: otpRecord._id });

      res.status(200).json({
        status: 'success',
        message: 'Email verified successfully. You can now login.',
      });
    } else if (type === '2fa') {
      const user = await User.findOne({ email });
      if (!user) {
        return next(new AppError('User not found.', 404));
      }

      await OTP.deleteOne({ _id: otpRecord._id });

      const { deviceName, deviceType } = req.body;

      // Generate token payloads
      const payload = {
        userId: user._id.toString(),
        username: user.username,
        isAdmin: user.isAdmin,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      // Register Device
      const deviceId = uuidv4();
      await Device.findOneAndUpdate(
        { userId: user._id, deviceName: deviceName || 'Web Browser' },
        {
          deviceId,
          deviceName: deviceName || 'Web Browser',
          deviceType: deviceType || 'browser',
          ipAddress: req.ip || '',
          lastActive: new Date(),
        },
        { upsert: true, new: true }
      );

      // Create session
      const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await Session.create({
        userId: user._id,
        refreshToken,
        deviceId,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        expiresAt: sessionExpiry,
      });

      // Set HTTP-Only Cookie for Refresh Token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Update user status
      user.status = 'online';
      await user.save();

      res.status(200).json({
        status: 'success',
        accessToken,
        deviceId,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          profilePhoto: user.profilePhoto,
          about: user.about,
          bio: user.bio,
          themePreference: user.themePreference,
          isAdmin: user.isAdmin,
          twoFactorEnabled: user.twoFactorEnabled,
        },
      });
    } else {
      // For reset password, keep the OTP record or mark it verified so the reset password endpoint can verify it.
      // But actually, we can do password reset in one go or keep OTP valid for 5 more minutes.
      // Let's return success, and the frontend will pass the same OTP to the reset password route.
      res.status(200).json({
        status: 'success',
        message: 'OTP verified. Please proceed to reset your password.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Login handler
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password, deviceName, deviceType } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return next(new AppError('Incorrect username/email or password.', 401));
    }

    if (!user.isVerified) {
      return next(new AppError('Your email address is not verified. Please register again or verify.', 403));
    }

    if (user.isBlocked) {
      return next(new AppError('Your account has been suspended by the administrator.', 403));
    }

    // 2FA Verification Flow
    if (user.twoFactorEnabled) {
      const otp = generateNumericOtp();
      const salt = await bcrypt.genSalt(10);
      const hashedOtp = await bcrypt.hash(otp, salt);

      // Save to DB
      await OTP.deleteMany({ email: user.email, type: '2fa' });
      await OTP.create({
        email: user.email,
        otp: hashedOtp,
        type: '2fa',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      });

      // Send Email
      await mailTransporter.sendMail({
        from: emailFrom,
        to: user.email,
        subject: 'Your VChats Two-Factor Authentication (2FA) Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #00B69B; text-align: center;">Two-Factor Authentication (2FA)</h2>
            <p>Please enter the following 6-digit OTP code to complete your login:</p>
            <div style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; padding: 15px; background-color: #f5f5f5; color: #333; margin: 20px 0; border-radius: 4px;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      res.status(200).json({
        status: 'success',
        twoFactorRequired: true,
        email: user.email,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      });
      return;
    }

    // Generate token payloads
    const payload = {
      userId: user._id.toString(),
      username: user.username,
      isAdmin: user.isAdmin,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Register Device
    const deviceId = uuidv4();
    await Device.findOneAndUpdate(
      { userId: user._id, deviceName: deviceName || 'Web Browser' },
      {
        deviceId,
        deviceName: deviceName || 'Web Browser',
        deviceType: deviceType || 'browser',
        ipAddress: req.ip || '',
        lastActive: new Date(),
      },
      { upsert: true, new: true }
    );

    // Create session
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await Session.create({
      userId: user._id,
      refreshToken,
      deviceId,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      expiresAt: sessionExpiry,
    });

    // Set HTTP-Only Cookie for Refresh Token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update user status
    user.status = 'online';
    await user.save();

    res.status(200).json({
      status: 'success',
      accessToken,
      deviceId,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        about: user.about,
        bio: user.bio,
        themePreference: user.themePreference,
        isAdmin: user.isAdmin,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token handler
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return next(new AppError('No refresh token provided.', 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return next(new AppError('Invalid refresh token.', 401));
    }

    // Find session in database
    const session = await Session.findOne({ refreshToken: token, isValid: true });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        session.isValid = false;
        await session.save();
      }
      return next(new AppError('Session expired or invalid refresh token.', 401));
    }

    // Generate new Access and Refresh tokens
    const payload = {
      userId: decoded.userId,
      username: decoded.username,
      isAdmin: decoded.isAdmin,
    };

    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    // Rotate refresh token in database session
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    // Set cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

// Logout handler
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
      // Invalidate session
      const session = await Session.findOne({ refreshToken: token });
      if (session) {
        session.isValid = false;
        await session.save();
        
        // Set last seen
        const user = await User.findById(session.userId);
        if (user) {
          user.status = 'offline';
          user.lastSeen = new Date();
          await user.save();
        }
      }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Logout from all devices
export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }

    // Invalidate all user sessions
    await Session.updateMany({ userId, isValid: true }, { isValid: false });

    // Set status to offline
    if (req.user) {
      req.user.status = 'offline';
      req.user.lastSeen = new Date();
      await req.user.save();
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Logged out from all devices.',
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password OTP trigger
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: true });
    if (!user) {
      return next(new AppError('No active user account found with this email address.', 404));
    }

    const otp = generateNumericOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save OTP
    await OTP.deleteMany({ email, type: 'reset' });
    await OTP.create({
      email,
      otp: hashedOtp,
      type: 'reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send Email
    await mailTransporter.sendMail({
      from: emailFrom,
      to: email,
      subject: 'Reset Your VChats Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #8B5CF6; text-align: center;">Reset Password Request</h2>
          <p>We received a request to reset your password. Use the verification OTP below to complete the reset process:</p>
          <div style="font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 4px; padding: 15px; background-color: #f5f5f5; color: #333; margin: 20px 0; border-radius: 4px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. If you did not make this request, please ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset OTP sent to email.',
      email,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password handler
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, password } = req.body;

    const otpRecord = await OTP.findOne({ email, type: 'reset' });
    if (!otpRecord) {
      return next(new AppError('OTP expired or not found. Please request a new OTP.', 400));
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return next(new AppError('Incorrect OTP. Please check and try again.', 400));
    }

    // Update password
    const user = await User.findOne({ email });
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    // Invalidate all current sessions
    await Session.updateMany({ userId: user._id, isValid: true }, { isValid: false });
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
