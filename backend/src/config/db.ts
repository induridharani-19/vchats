import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const connString = process.env.MONGODB_URI;
    if (!connString) {
      console.error('Error: MONGODB_URI is not defined in environment variables.');
      process.exit(1);
    }
    
    // Replace <db_password> placeholder if it exists so the app doesn't crash on initial launch if password is not configured yet
    const sanitizedConnString = connString.replace('<db_password>', process.env.MONGODB_PASSWORD || 'password');

    const conn = await mongoose.connect(sanitizedConnString);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${(error as Error).message}`);
    process.exit(1);
  }
};
