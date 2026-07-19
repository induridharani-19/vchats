import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CallUser {
  id: string;
  username: string;
  displayName: string;
  profilePhoto: string;
}

interface CallState {
  incomingCall: boolean;
  activeCall: boolean;
  isCaller: boolean;
  callType: 'voice' | 'video' | null;
  callId: string | null;
  conversationId: string | null;
  callLogId: string | null;
  callStatus: 'ringing' | 'connected' | 'ended' | 'idle';
  peerUser: CallUser | null;
}

const initialState: CallState = {
  incomingCall: false,
  activeCall: false,
  isCaller: false,
  callType: null,
  callId: null,
  conversationId: null,
  callLogId: null,
  callStatus: 'idle',
  peerUser: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    receiveCall: (
      state,
      action: PayloadAction<{
        caller: CallUser;
        callType: 'voice' | 'video';
        callId: string;
        conversationId: string;
        callLogId?: string;
      }>
    ) => {
      state.incomingCall = true;
      state.activeCall = false;
      state.isCaller = false;
      state.peerUser = action.payload.caller;
      state.callType = action.payload.callType;
      state.callId = action.payload.callId;
      state.conversationId = action.payload.conversationId;
      state.callLogId = action.payload.callLogId || null;
      state.callStatus = 'ringing';
    },
    startCall: (
      state,
      action: PayloadAction<{
        receiver: CallUser;
        callType: 'voice' | 'video';
        callId: string;
        conversationId: string;
        callLogId?: string;
      }>
    ) => {
      state.incomingCall = false;
      state.activeCall = true;
      state.isCaller = true;
      state.peerUser = action.payload.receiver;
      state.callType = action.payload.callType;
      state.callId = action.payload.callId;
      state.conversationId = action.payload.conversationId;
      state.callLogId = action.payload.callLogId || null;
      state.callStatus = 'ringing';
    },
    acceptCall: (state) => {
      state.incomingCall = false;
      state.activeCall = true;
      state.callStatus = 'connected';
    },
    connectCall: (state) => {
      state.callStatus = 'connected';
    },
    endCall: (state) => {
      state.incomingCall = false;
      state.activeCall = false;
      state.isCaller = false;
      state.callType = null;
      state.callId = null;
      state.conversationId = null;
      state.callLogId = null;
      state.callStatus = 'ended';
      state.peerUser = null;
    },
    resetCallState: (state) => {
      state.incomingCall = false;
      state.activeCall = false;
      state.isCaller = false;
      state.callType = null;
      state.callId = null;
      state.conversationId = null;
      state.callLogId = null;
      state.callStatus = 'idle';
      state.peerUser = null;
    },
  },
});

export const {
  receiveCall,
  startCall,
  acceptCall,
  connectCall,
  endCall,
  resetCallState,
} = callSlice.actions;

export default callSlice.reducer;
