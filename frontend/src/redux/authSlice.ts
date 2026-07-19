import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('accessToken'),
  deviceId: localStorage.getItem('deviceId'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (
      state,
      action: PayloadAction<{ user: User; token: string; deviceId: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.deviceId = action.payload.deviceId;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('accessToken', action.payload.token);
      localStorage.setItem('deviceId', action.payload.deviceId);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    updateTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      if (state.user) {
        state.user.themePreference = action.payload;
      }
    },
    updatePhoto: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.profilePhoto = action.payload;
      }
    },
    refreshTokenSuccess: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload);
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.deviceId = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('deviceId');
    },
  },
});

export const {
  authStart,
  authSuccess,
  updateUser,
  updateTheme,
  updatePhoto,
  refreshTokenSuccess,
  authFailure,
  logoutSuccess,
} = authSlice.actions;

export default authSlice.reducer;
