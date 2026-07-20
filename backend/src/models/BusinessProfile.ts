import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
}

export interface IQuickReply {
  keyword: string;
  message: string;
}

export interface IBusinessProfile extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  hours: string;
  catalog: IProduct[];
  quickReplies: IQuickReply[];
  createdAt: Date;
  updatedAt: Date;
}

const BusinessProfileSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    category: {
      type: String,
      default: 'General Business',
    },
    hours: {
      type: String,
      default: 'Mon-Fri: 9:00 AM - 6:00 PM',
    },
    catalog: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        description: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
      },
    ],
    quickReplies: [
      {
        keyword: { type: String, required: true },
        message: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IBusinessProfile>('BusinessProfile', BusinessProfileSchema);
