import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reportedUserId: mongoose.Types.ObjectId;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
