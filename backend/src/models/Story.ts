import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryViewer {
  userId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  textContent?: string;
  background?: string; // background color for text status
  caption?: string;
  songTitle?: string;
  songArtist?: string;
  songAlbumArt?: string;
  songPreviewUrl?: string;
  viewers: IStoryViewer[];
  duration?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio'],
      required: true,
    },
    textContent: {
      type: String,
    },
    background: {
      type: String,
      default: '#00B69B',
    },
    caption: {
      type: String,
      default: '',
      maxlength: 200,
    },
    songTitle: {
      type: String,
    },
    songArtist: {
      type: String,
    },
    songAlbumArt: {
      type: String,
    },
    songPreviewUrl: {
      type: String,
    },
    viewers: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    duration: {
      type: Number,
      default: 30, // Default duration in seconds
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  },
  {
    timestamps: true,
  }
);

StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ userId: 1 });

export default mongoose.model<IStory>('Story', StorySchema);
