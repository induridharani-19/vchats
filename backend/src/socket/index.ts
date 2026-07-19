import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { ITokenPayload } from '../utils/jwt';

// Track online user sockets: userId -> array of socketIds (multiple device support)
const userSockets = new Map<string, string[]>();

export const initSocket = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket auth middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: Token missing.'));
      }

      const secret = process.env.JWT_ACCESS_SECRET || 'vchats_access_token_secret_2026_super_secure_key_98231';
      const decoded = jwt.verify(token as string, secret) as ITokenPayload;

      const user = await User.findById(decoded.userId);
      if (!user || user.isBlocked) {
        return next(new Error('Authentication error: User invalid or blocked.'));
      }

      socket.data.user = user;
      socket.data.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    const user = socket.data.user;

    // Add socket to tracker
    const activeSockets = userSockets.get(userId) || [];
    activeSockets.push(socket.id);
    userSockets.set(userId, activeSockets);

    // Join user-specific channel (for target push notifies, alerts, system broadcasts)
    socket.join(userId);

    // Update status to online if it was offline
    if (user.status !== 'online') {
      user.status = 'online';
      await user.save();
      
      // Broadcast online status to contacts
      socket.broadcast.emit('user-online', { userId, status: 'online' });
    }

    console.log(`User connected: ${user.username} (${socket.id})`);

    // 1. Join room (Conversation ID room)
    socket.on('join-room', (conversationId: string) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined room: ${conversationId}`);
    });

    // 2. Leave room
    socket.on('leave-room', (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`Socket ${socket.id} left room: ${conversationId}`);
    });

    // 3. Typing indicator
    socket.on('typing', ({ conversationId, username }) => {
      socket.to(conversationId).emit('typing', { conversationId, userId, username });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.to(conversationId).emit('stop-typing', { conversationId, userId });
    });

    socket.on('user-presence-change', ({ status }) => {
      if (status === 'offline') {
        socket.broadcast.emit('user-offline', { userId, lastSeen: new Date() });
      } else {
        socket.broadcast.emit('user-online', { userId, status: 'online' });
      }
    });

    // 4. WebRTC Signaling Events (Audio/Video Calling)
    socket.on('call-start', ({ targetUserId, callType, callId, conversationId }) => {
      // Forward call initiation alert to all active sockets of the target user
      socket.to(targetUserId).emit('call-incoming', {
        caller: {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          profilePhoto: user.profilePhoto,
        },
        callType,
        callId,
        conversationId,
      });
    });

    socket.on('call-accept', ({ callerId, callId }) => {
      socket.to(callerId).emit('call-accepted', { callId, receiverId: userId });
    });

    socket.on('call-reject', ({ callerId, callId }) => {
      socket.to(callerId).emit('call-rejected', { callId, receiverId: userId });
    });

    socket.on('call-end', ({ targetUserId, callId, duration }) => {
      socket.to(targetUserId).emit('call-ended', { callId, duration });
    });

    socket.on('group-call-start', ({ participants, callType, callId, conversationId, groupName }) => {
      participants.forEach((pId: string) => {
        if (pId !== userId) {
          socket.to(pId).emit('group-call-incoming', {
            caller: {
              id: user._id,
              username: user.username,
              displayName: user.displayName,
              profilePhoto: user.profilePhoto,
            },
            callType,
            callId,
            conversationId,
            groupName,
          });
        }
      });
    });

    socket.on('group-call-join', ({ callId }) => {
      socket.join(`call-${callId}`);
      socket.to(`call-${callId}`).emit('group-call-peer-joined', { userId, username: user.username });
    });

    socket.on('group-call-leave', ({ callId }) => {
      socket.leave(`call-${callId}`);
      socket.to(`call-${callId}`).emit('group-call-peer-left', { userId });
    });

    socket.on('webrtc-offer', ({ targetUserId, offer }) => {
      socket.to(targetUserId).emit('webrtc-offer', { senderId: userId, offer });
    });

    socket.on('webrtc-answer', ({ targetUserId, answer }) => {
      socket.to(targetUserId).emit('webrtc-answer', { senderId: userId, answer });
    });

    socket.on('webrtc-ice-candidate', ({ targetUserId, candidate }) => {
      socket.to(targetUserId).emit('webrtc-ice-candidate', { senderId: userId, candidate });
    });

    socket.on('call-reaction', ({ targetUserId, reaction }) => {
      socket.to(targetUserId).emit('call-reaction', { senderId: userId, reaction });
    });

    // 5. Disconnect
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const currentSockets = userSockets.get(userId) || [];
      const updatedSockets = currentSockets.filter((id) => id !== socket.id);
      
      if (updatedSockets.length === 0) {
        // No active devices left, mark offline
        userSockets.delete(userId);
        
        const freshUser = await User.findById(userId);
        if (freshUser) {
          freshUser.status = 'offline';
          freshUser.lastSeen = new Date();
          await freshUser.save();
          
          // Broadcast offline status
          io.emit('user-offline', { userId, lastSeen: freshUser.lastSeen });
        }
      } else {
        userSockets.set(userId, updatedSockets);
      }
    });
  });

  return io;
};

// Helper function to send notification to a user's active sockets
export const sendSocketAlert = (io: Server, userId: string, eventName: string, data: any) => {
  io.to(userId).emit(eventName, data);
};
