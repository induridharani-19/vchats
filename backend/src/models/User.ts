import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  profilePhoto: string;
  about: string;
  status: 'online' | 'offline';
  bio: string;
  themePreference: 'light' | 'dark';
  lastSeen: Date;
  isVerified: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  blockedUsers: mongoose.Types.ObjectId[];
  friends: mongoose.Types.ObjectId[];
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
  chatLockPin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: '', // will be Cloudinary URL
    },
    about: {
      type: String,
      default: 'Hey there! I am using VChats.',
      maxlength: 150,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500,
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark'],
      default: 'dark',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: '',
    },
    chatLockPin: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Add index on username and email for faster queries
UserSchema.index({ username: 1, email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
