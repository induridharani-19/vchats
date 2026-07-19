import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  type: 'direct' | 'group';
  participants: mongoose.Types.ObjectId[];
  groupId?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  pinnedBy: mongoose.Types.ObjectId[];
  mutedBy: mongoose.Types.ObjectId[];
  favorites: mongoose.Types.ObjectId[];
  archivedBy: mongoose.Types.ObjectId[];
  lockedBy: mongoose.Types.ObjectId[];
  unreadCounts: Map<string, number>;
    themeColor?: string;
    themeImage?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  const ConversationSchema: Schema = new Schema(
    {
      type: {
        type: String,
        enum: ['direct', 'group'],
        required: true,
      },
      participants: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      groupId: {
        type: Schema.Types.ObjectId,
        ref: 'Group',
      },
      lastMessage: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
      pinnedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      mutedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      favorites: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      archivedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      lockedBy: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      unreadCounts: {
        type: Map,
        of: Number,
        default: {},
      },
      themeColor: {
        type: String,
        default: '',
      },
      themeImage: {
        type: String,
        default: '',
      },
    },
  {
    timestamps: true,
  }
);

// Index participants for quick list lookups
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ type: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
