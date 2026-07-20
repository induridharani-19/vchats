import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt {
  userId: mongoose.Types.ObjectId;
  time: Date;
}

export interface IEmbeddedReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
}

export interface IPollOption {
  id: string;
  text: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'poll' | 'payment';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  seenBy: IReceipt[];
  deliveredTo: IReceipt[];
  reactions: IEmbeddedReaction[];
  pollOptions?: IPollOption[];
  isViewOnce?: boolean;
  isViewedOnce?: boolean;
  starredBy?: mongoose.Types.ObjectId[];
  paymentAmount?: number;
  paymentStatus?: string;
  replyTo?: mongoose.Types.ObjectId;
  forwarded: boolean;
  isEdited: boolean;
  deletedFor: mongoose.Types.ObjectId[];
  deletedForEveryone: boolean;
  scheduledFor?: Date;
  isDisappearing: boolean;
  disappearsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'poll', 'payment'],
      default: 'text',
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    seenBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        time: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        time: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, required: true },
      },
    ],
    pollOptions: [
      {
        id: { type: String, required: true },
        text: { type: String, required: true },
        votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    isViewOnce: {
      type: Boolean,
      default: false,
    },
    isViewedOnce: {
      type: Boolean,
      default: false,
    },
    starredBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    paymentAmount: {
      type: Number,
    },
    paymentStatus: {
      type: String,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    forwarded: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    scheduledFor: {
      type: Date,
    },
    isDisappearing: {
      type: Boolean,
      default: false,
    },
    disappearsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' });

export default mongoose.model<IMessage>('Message', MessageSchema);
