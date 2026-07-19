import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret || cloudName.includes('your_') || apiKey.includes('your_') || apiSecret.includes('your_')) {
    console.warn('Cloudinary credentials are not configured. File uploads will be mocked locally.');
  }

  cloudinary.config({
    cloud_name: cloudName || 'mock-cloud',
    api_key: apiKey || 'mock-key',
    api_secret: apiSecret || 'mock-secret',
    secure: true
  });
};

configureCloudinary();

export default cloudinary;
