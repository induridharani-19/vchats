import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { verifyAccessToken, ITokenPayload } from '../utils/jwt';
import User, { IUser } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: ITokenPayload;
}

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // Allow getting access token from cookies if present
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // Verify token
    let decoded: ITokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return next(new AppError('Invalid or expired access token.', 401));
    }

    // Check if user still exists
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user is blocked
    if (currentUser.isBlocked) {
      return next(new AppError('Your account has been suspended/blocked. Contact admin.', 403));
    }

    // Check if user is verified
    if (!currentUser.isVerified) {
      return next(new AppError('Your email has not been verified yet. Please verify.', 403));
    }

    // Grant access and store user details in request
    req.user = currentUser;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictToAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.isAdmin) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};
