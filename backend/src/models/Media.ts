import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId;
  fileUrl: string;
  fileName: string;
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other';
  fileSize: number;
  publicId?: string; // Cloudinary public asset ID
  createdAt: Date;
}

const MediaSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'other'],
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  publicId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

MediaSchema.index({ conversationId: 1, fileType: 1 });
MediaSchema.index({ userId: 1 });

export default mongoose.model<IMedia>('Media', MediaSchema);
