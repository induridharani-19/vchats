import mongoose, { Schema, Document } from 'mongoose';

export interface IStatus extends Document {
  userId: mongoose.Types.ObjectId;
  customText: string;
  emoji?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StatusSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Only one active custom status per user
    },
    customText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    emoji: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to clear expired custom statuses
StatusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StatusSchema.index({ userId: 1 });

export default mongoose.model<IStatus>('Status', StatusSchema);
