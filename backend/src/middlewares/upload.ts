import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/appError';
import cloudinary from '../config/cloudinary';

// Ensure local uploads directory exists
const localUploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

// Multer disk storage for local temp files before uploading to Cloudinary
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, localUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req: Request, file: any, cb: multer.FileFilterCallback) => {
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', // Images
    '.mp4', '.mov', '.avi', '.mkv', '.webm',   // Videos
    '.mp3', '.wav', '.ogg', '.m4a',           // Audio/Voice Notes
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar' // Documents
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file format: ${ext}`, 400) as any, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Helper function to upload file (to Cloudinary or local mock fallback)
export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
): Promise<{ url: string; publicId?: string }> => {
  const isMock = !process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.includes('your_');

  if (isMock) {
    // Return local mock url
    const fileName = path.basename(filePath);
    console.log(`[MOCK UPLOAD] File ${fileName} stored locally. Mocking Cloudinary URL.`);
    return {
      url: `/uploads/${fileName}`,
      publicId: `mock-id-${Date.now()}`,
    };
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `vchats/${folder}`,
      resource_type: resourceType,
    });

    // Remove local temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    // Return local fallback url on error
    const fileName = path.basename(filePath);
    return {
      url: `/uploads/${fileName}`,
      publicId: `fallback-id-${Date.now()}`,
    };
  }
};
