import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  profilePhoto: string;
  gender?: 'male' | 'female' | 'other';
  about: string;
  status: 'online' | 'offline';
  bio: string;
  birthday?: Date;
  themePreference: 'light' | 'dark';
  lastSeen: Date;
  isVerified: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  isBusinessAccount?: boolean;
  blockedUsers: mongoose.Types.ObjectId[];
  friends: mongoose.Types.ObjectId[];
  favoriteContacts?: mongoose.Types.ObjectId[];
  starredMessages?: mongoose.Types.ObjectId[];
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
  chatLockPin?: string;
  secretCode?: string;
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
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'male',
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
    birthday: {
      type: Date,
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
    isBusinessAccount: {
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
    favoriteContacts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    starredMessages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
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
    secretCode: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ username: 1, email: 1 });

export default mongoose.model<IUser>('User', UserSchema);
