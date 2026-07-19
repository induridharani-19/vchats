import mongoose, { Schema, Document } from 'mongoose';

export interface IReceipt {
  userId: mongoose.Types.ObjectId;
  time: Date;
}

export interface IEmbeddedReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  seenBy: IReceipt[];
  deliveredTo: IReceipt[];
  reactions: IEmbeddedReaction[];
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
      enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact'],
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

// Indexes for fast history loading and search
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' }); // for message search

export default mongoose.model<IMessage>('Message', MessageSchema);
