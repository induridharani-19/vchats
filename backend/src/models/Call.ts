import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  conversationId?: mongoose.Types.ObjectId;
  callerId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId; // 1-to-1 call receiver (optional for group calls)
  type: 'voice' | 'video';
  status: 'initiated' | 'connected' | 'missed' | 'rejected' | 'ended';
  duration: number; // in seconds
  startedAt?: Date;
  endedAt?: Date;
  deletedFor?: mongoose.Types.ObjectId[];
  messageId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    callerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    type: {
      type: String,
      enum: ['voice', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'connected', 'missed', 'rejected', 'ended'],
      default: 'initiated',
    },
    duration: {
      type: Number,
      default: 0,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: false,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

CallSchema.index({ callerId: 1 });
CallSchema.index({ receiverId: 1 });

export default mongoose.model<ICall>('Call', CallSchema);
