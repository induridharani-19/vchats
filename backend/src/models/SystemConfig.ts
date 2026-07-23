import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  appName: string;
  appLogo: string;
  accentColor: string;
  showAds: boolean;
  adImageUrl: string;
  adTargetUrl: string;
  adText: string;
  e2eEnforced: boolean;
  autoDeleteDays: number;
  allowNewRegistrations: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema: Schema = new Schema(
  {
    appName: {
      type: String,
      default: 'VChats',
    },
    appLogo: {
      type: String,
      default: '',
    },
    accentColor: {
      type: String,
      default: '#0d9488', // Default brandTeal color code
    },
    showAds: {
      type: Boolean,
      default: false,
    },
    adImageUrl: {
      type: String,
      default: '',
    },
    adTargetUrl: {
      type: String,
      default: '',
    },
    adText: {
      type: String,
      default: '',
    },
    e2eEnforced: {
      type: Boolean,
      default: true,
    },
    autoDeleteDays: {
      type: Number,
      default: 0, // 0 means disabled
    },
    allowNewRegistrations: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'We are currently running scheduled updates to VChats. The application will return online shortly. Thank you for your patience!',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
