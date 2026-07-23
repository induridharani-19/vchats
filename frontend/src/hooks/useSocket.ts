import { useEffect, useState } from 'react';
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

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://vchats-o1pe.onrender.com';

let socketInstance: Socket | null = null;
let listenersBound = false;

const showSystemNotification = (title: string, options: any) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        new Notification(title, options);
      }
    } catch (e) {
      console.error('Notification trigger error:', e);
    }
  }
};

export const useSocket = () => {
  const dispatch = useDispatch();
  const { token, user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [socket, setSocket] = useState<Socket | null>(socketInstance);

  useEffect(() => {
    if (!isAuthenticated || !token || !user) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        listenersBound = false;
        setSocket(null);
      }
      return;
    }

    // Auto-request System & Lockscreen Notification Permissions
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Connect socket if not already connected
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: {
          token,
        },
      });
      setSocket(socketInstance);
    }

    // Update local state if instance is already set (e.g. on hot reload or tab change)
    if (socketInstance && socket !== socketInstance) {
      setSocket(socketInstance);
    }

    if (socketInstance && !listenersBound) {
      listenersBound = true;

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
        if (document.hidden && message.senderId?._id !== user?._id) {
          const senderName = message.senderId?.displayName || message.senderId?.username || 'VChats';
          const bodyText = message.content || (message.fileUrl ? '📎 Sent a file' : 'New message received');
          showSystemNotification(`💬 ${senderName}`, {
            body: bodyText,
            icon: message.senderId?.profilePhoto || '/logo192.png',
            tag: `msg-${message.conversationId}`,
            renotify: true,
            vibrate: [200, 100, 200],
          });
        }
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
        window.location.reload();
      });

      // WebRTC Signal Forwarding / Calling UI triggers with Native System Notification
      socketInstance.on('call-incoming', ({ caller, callType, callId, conversationId, callLogId }) => {
        dispatch(receiveCall({ caller, callType, callId, conversationId, callLogId }));
        const callerName = caller.displayName || caller.username || 'Someone';
        showSystemNotification(`📞 Incoming ${callType.toUpperCase()} Call`, {
          body: `${callerName} is calling you on VChats...`,
          icon: caller.profilePhoto || '/logo192.png',
          tag: `call-${callId}`,
          renotify: true,
          vibrate: [300, 200, 300, 200, 300],
        });
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
        showSystemNotification(`📞 Incoming Group ${callType.toUpperCase()} Call`, {
          body: `Group Call started in ${groupName || 'Group'}...`,
          icon: caller.profilePhoto || '/logo192.png',
          tag: `group-call-${callId}`,
          renotify: true,
          vibrate: [300, 200, 300, 200, 300],
        });
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
  }, [isAuthenticated, token, user, dispatch]);

  return socket;
};
