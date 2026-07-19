import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { RootState } from '../redux/store';
import {
  addMessage,
  updateConversation,
  userCameOnline,
  userWentOffline,
  setTyping,
  stopTyping,
  updateMessageStatus,
  deleteMessage,
  markMessagesAsSeen,
  removeConversation,
  updateConversationTheme,
} from '../redux/chatSlice';
import { receiveCall, endCall, connectCall } from '../redux/callSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    // Connect socket if not already connected
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: {
          token,
        },
      });

      // Bind global real-time listeners
      socketInstance.on('connect', () => {
        console.log('Socket.io Connected');
      });

      // Online presence
      socketInstance.on('user-online', ({ userId }) => {
        dispatch(userCameOnline(userId));
      });

      socketInstance.on('user-offline', ({ userId }) => {
        dispatch(userWentOffline(userId));
      });

      // Messages & Conversations updates
      socketInstance.on('message-receive', (message) => {
        dispatch(addMessage(message));
      });

      socketInstance.on('messages-seen', ({ userId, messageIds }) => {
        dispatch(markMessagesAsSeen({ messageIds, userId }));
      });

      socketInstance.on('conversation-update', (conversation) => {
        dispatch(updateConversation(conversation));
      });

      socketInstance.on('message-edit', (message) => {
        dispatch(updateMessageStatus(message));
      });

      socketInstance.on('message-delete', (message) => {
        dispatch(deleteMessage(message));
      });

      socketInstance.on('conversation-deleted', (conversationId) => {
        dispatch(removeConversation(conversationId));
      });

      socketInstance.on('conversation-theme-update', ({ conversationId, themeColor, themeImage }) => {
        dispatch(updateConversationTheme({ conversationId, themeColor, themeImage }));
      });

      // Reactions
      socketInstance.on('reaction-add', ({ messageId, reactions }) => {
        // We can dispatch a local update
        dispatch(updateMessageStatus({ _id: messageId, reactions } as any));
      });

      socketInstance.on('reaction-remove', ({ messageId, reactions }) => {
        dispatch(updateMessageStatus({ _id: messageId, reactions } as any));
      });

      // Typing indicators
      socketInstance.on('typing', ({ conversationId, userId, username }) => {
        dispatch(setTyping({ conversationId, userId, username }));
      });

      socketInstance.on('stop-typing', ({ conversationId, userId }) => {
        dispatch(stopTyping({ conversationId, userId }));
      });

      // Group activities
      socketInstance.on('group-created', (conversation) => {
        dispatch(updateConversation(conversation));
      });

      socketInstance.on('group-removed', () => {
        // Remove conversation or set active to null
        // For simplicity we just reload page or handle conversation deletion
        window.location.reload();
      });

      // WebRTC Signal Forwarding / Calling UI triggers
      socketInstance.on('call-incoming', ({ caller, callType, callId, conversationId, callLogId }) => {
        dispatch(receiveCall({ caller, callType, callId, conversationId, callLogId }));
      });

      socketInstance.on('group-call-incoming', ({ caller, callType, callId, conversationId, groupName, callLogId }) => {
        dispatch(receiveCall({
          caller: {
            id: 'group',
            username: 'group',
            displayName: groupName || 'Group Call',
            profilePhoto: caller.profilePhoto || '',
          },
          callType,
          callId,
          conversationId,
          callLogId,
        }));
      });

      socketInstance.on('call-ended', () => {
        dispatch(endCall());
      });

      socketInstance.on('call-accepted', () => {
        dispatch(connectCall());
      });

      socketInstance.on('call-rejected', () => {
        dispatch(endCall());
      });

      // System alerts
      socketInstance.on('system-broadcast', ({ title, message }) => {
        alert(`[${title}]: ${message}`);
      });

      // Forced disconnects (e.g. account bans)
      socketInstance.on('force-logout', ({ reason }) => {
        alert(reason);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Keep socket open unless user logs out (so cleanup doesn't trigger on every rerender)
    };
  }, [isAuthenticated, token, user, dispatch]);

  return socketRef.current;
};
