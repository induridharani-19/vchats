import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  followers: mongoose.Types.ObjectId[];
  avatar: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    avatar: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ChannelSchema.index({ name: 1 });

export default mongoose.model<IChannel>('Channel', ChannelSchema);
