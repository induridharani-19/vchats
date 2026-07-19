import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember extends Document {
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'admin' | 'co-admin' | 'member';
  isMuted: boolean;
  muteUntil?: Date;
  joinedAt: Date;
}

const GroupMemberSchema: Schema = new Schema({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'co-admin', 'member'],
    default: 'member',
  },
  isMuted: {
    type: Boolean,
    default: false,
  },
  muteUntil: {
    type: Date,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

// Composite index to check member lookup quickly
GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
GroupMemberSchema.index({ userId: 1 });

export default mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);
