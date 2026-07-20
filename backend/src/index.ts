import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { connectDB } from './config/db';
import { initSocket } from './socket';
import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/appError';

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import messageRoutes from './routes/messageRoutes';
import groupRoutes from './routes/groupRoutes';
import channelRoutes from './routes/channelRoutes';
import statusRoutes from './routes/statusRoutes';
import callRoutes from './routes/callRoutes';
import adminRoutes from './routes/adminRoutes';
import friendRoutes from './routes/friendRoutes';
import aiRoutes from './routes/aiRoutes';
import { startScheduledMessagesJob } from './jobs/scheduledMessages';

const app = express();
const httpServer = createServer(app);

// Connect to Database
connectDB();

// Setup Socket.io
const io = initSocket(httpServer);
app.set('io', io); // Make io accessible in controllers
startScheduledMessagesJob(io);

// Global Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP temporarily in dev for WebRTC, or customize for production
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5180',
  'http://localhost:3000',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    
    // In development, allow any origin (e.g. local IPs like 192.168.x.x) to prevent CORS blocks
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some((allowed) => allowed && origin === allowed) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static folder for local upload storage fallback
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use('/api/', limiter);

// Root health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'VChats API Server is live and running!',
    timestamp: new Date(),
  });
});

// Register Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/ai', aiRoutes);

// Catch-all API Route 404
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`VChats Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
