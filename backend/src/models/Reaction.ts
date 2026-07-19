import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction extends Document {
  messageId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

const ReactionSchema: Schema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only have one reaction per message
ReactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IReaction>('Reaction', ReactionSchema);
