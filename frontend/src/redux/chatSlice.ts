import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, Message } from '../types';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: string[];
  typingStatus: {
    [conversationId: string]: {
      [userId: string]: string; // userId -> username
    };
  };
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: [],
  typingStatus: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    updateConversationTheme: (
      state,
      action: PayloadAction<{ conversationId: string; themeColor: string; themeImage: string }>
    ) => {
      const { conversationId, themeColor, themeImage } = action.payload;
      const idx = state.conversations.findIndex((c) => c._id === conversationId);
      if (idx > -1) {
        state.conversations[idx].themeColor = themeColor;
        state.conversations[idx].themeImage = themeImage;
      }
      if (state.activeConversation && state.activeConversation._id === conversationId) {
        state.activeConversation = {
          ...state.activeConversation,
          themeColor,
          themeImage,
        };
      }
    },
    updateConversation: (state, action: PayloadAction<Conversation>) => {
      const idx = state.conversations.findIndex((c) => c._id === action.payload._id);
      if (idx > -1) {
        const updated = { ...state.conversations[idx], ...action.payload };
        if (state.activeConversation && state.activeConversation._id === action.payload._id) {
          state.activeConversation = { ...state.activeConversation, ...action.payload };
        }
        state.conversations[idx] = updated;
      } else {
        const updated = { ...action.payload };
        state.conversations.unshift(updated);
      }
      // Resort conversations by latest activity
      state.conversations.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },
    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.activeConversation = action.payload;
      if (action.payload) {
        // Reset unread count locally
        const idx = state.conversations.findIndex((c) => c._id === action.payload?._id);
        if (idx > -1) {
          state.conversations[idx] = {
            ...state.conversations[idx],
            unreadCounts: {}
          };
        }
      }
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      if (state.activeConversation && state.activeConversation._id === action.payload.conversationId) {
        // Add to active window if message is not already in list
        const exists = state.messages.some((m) => m._id === action.payload._id);
        if (!exists) {
          state.messages.push(action.payload);
        }
      }
    },
    updateMessageStatus: (state, action: PayloadAction<Message>) => {
      if (state.activeConversation && state.activeConversation._id === action.payload.conversationId) {
        const idx = state.messages.findIndex((m) => m._id === action.payload._id);
        if (idx > -1) {
          state.messages[idx] = action.payload;
        }
      }
    },
    deleteMessage: (state, action: PayloadAction<Message>) => {
      if (state.activeConversation && state.activeConversation._id === action.payload.conversationId) {
        const idx = state.messages.findIndex((m) => m._id === action.payload._id);
        if (idx > -1) {
          state.messages[idx] = action.payload; // Updates to "deleted for everyone" view
        }
      }
    },
    markMessagesAsSeen: (state, action: PayloadAction<{ messageIds: string[]; userId: string }>) => {
      const { messageIds, userId } = action.payload;
      state.messages = state.messages.map((msg) => {
        if (messageIds.includes(msg._id)) {
          const exists = msg.seenBy?.some((s: any) => {
            const sUid = typeof s === 'object' ? s.userId?._id || s.userId || s : s;
            return sUid === userId;
          });
          if (!exists) {
            return {
              ...msg,
              seenBy: [...(msg.seenBy || []), { userId, time: new Date().toISOString() }]
            } as any;
          }
        }
        return msg;
      });
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
    userCameOnline: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    userWentOffline: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter((id) => id !== action.payload);
    },
    setTyping: (
      state,
      action: PayloadAction<{ conversationId: string; userId: string; username: string }>
    ) => {
      const { conversationId, userId, username } = action.payload;
      if (!state.typingStatus[conversationId]) {
        state.typingStatus[conversationId] = {};
      }
      state.typingStatus[conversationId][userId] = username;
    },
    stopTyping: (state, action: PayloadAction<{ conversationId: string; userId: string }>) => {
      const { conversationId, userId } = action.payload;
      if (state.typingStatus[conversationId]) {
        delete state.typingStatus[conversationId][userId];
      }
    },
    removeConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter((c) => c._id !== action.payload);
      if (state.activeConversation && state.activeConversation._id === action.payload) {
        state.activeConversation = null;
      }
    },
    clearChatState: (state) => {
      state.conversations = [];
      state.activeConversation = null;
      state.messages = [];
      state.onlineUsers = [];
      state.typingStatus = {};
    },
  },
});

export const {
  setConversations,
  updateConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  updateMessageStatus,
  deleteMessage,
  markMessagesAsSeen,
  setOnlineUsers,
  userCameOnline,
  userWentOffline,
  setTyping,
  stopTyping,
  removeConversation,
  clearChatState,
  updateConversationTheme,
} = chatSlice.actions;

export default chatSlice.reducer;
