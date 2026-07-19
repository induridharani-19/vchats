import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description: string;
  avatar: string;
  creator: mongoose.Types.ObjectId;
  settings: {
    announcementsOnly: boolean;
    restrictInfoEditing: boolean;
    memberApprovalRequired: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      default: '',
      maxlength: 250,
    },
    avatar: {
      type: String,
      default: '',
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    settings: {
      announcementsOnly: {
        type: Boolean,
        default: false,
      },
      restrictInfoEditing: {
        type: Boolean,
        default: false,
      },
      memberApprovalRequired: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
