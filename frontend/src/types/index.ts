export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  profilePhoto: string;
  about: string;
  status: 'online' | 'offline';
  bio: string;
  themePreference: 'light' | 'dark';
  lastSeen: string;
  isVerified: boolean;
  isAdmin: boolean;
  blockedUsers: string[] | User[];
  friends?: string[] | User[];
  twoFactorEnabled?: boolean;
  chatLockPin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receipt {
  userId: string;
  time: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User; // Populated User details
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  seenBy: Receipt[];
  deliveredTo: Receipt[];
  reactions: Reaction[];
  replyTo?: Message;
  forwarded: boolean;
  isEdited: boolean;
  deletedFor: string[];
  deletedForEveryone: boolean;
  scheduledFor?: string;
  isDisappearing: boolean;
  disappearsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSettings {
  announcementsOnly: boolean;
  restrictInfoEditing: boolean;
  memberApprovalRequired: boolean;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  avatar: string;
  creator: {
    _id: string;
    username: string;
    displayName: string;
  };
  settings: GroupSettings;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  participants: User[];
  groupId?: Group;
  lastMessage?: Message;
  pinnedBy: string[];
  mutedBy: string[];
  favorites: string[];
  archivedBy: string[];
  lockedBy: string[];
  unreadCounts: { [userId: string]: number };
  themeColor?: string;
  themeImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  _id: string;
  name: string;
  description: string;
  owner: User;
  followers: string[];
  avatar: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoryViewer {
  userId: User;
  viewedAt: string;
}

export interface Story {
  _id: string;
  userId: User;
  mediaUrl?: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  textContent?: string;
  background?: string;
  caption?: string;
  songTitle?: string;
  songArtist?: string;
  songAlbumArt?: string;
  songPreviewUrl?: string;
  viewers: StoryViewer[];
  duration?: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  _id: string;
  conversationId?: string;
  callerId: User;
  receiverId: User;
  type: 'voice' | 'video';
  status: 'initiated' | 'connected' | 'missed' | 'rejected' | 'ended';
  duration: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}
