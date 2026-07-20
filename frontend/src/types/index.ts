export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  profilePhoto: string;
  gender?: 'male' | 'female' | 'other';
  about: string;
  status: 'online' | 'offline';
  bio: string;
  birthday?: string;
  themePreference: 'light' | 'dark';
  lastSeen: string;
  isVerified: boolean;
  isAdmin: boolean;
  isBusinessAccount?: boolean;
  blockedUsers: string[] | User[];
  friends?: string[] | User[];
  favoriteContacts?: string[] | User[];
  starredMessages?: string[];
  twoFactorEnabled?: boolean;
  chatLockPin?: string;
  secretCode?: string;
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

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User; // Populated User details
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'poll' | 'payment';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  seenBy: Receipt[];
  deliveredTo: Receipt[];
  reactions: Reaction[];
  pollOptions?: PollOption[];
  isViewOnce?: boolean;
  isViewedOnce?: boolean;
  starredBy?: string[];
  paymentAmount?: number;
  paymentStatus?: string;
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
  isVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  _id: string;
  userId: User;
  mediaUrl: string;
  mediaType?: 'image' | 'video' | 'text' | 'audio';
  caption: string;
  type: 'image' | 'video' | 'text' | 'audio';
  background?: string;
  textContent?: string;
  songTitle?: string;
  songArtist?: string;
  songAlbumArt?: string;
  songPreviewUrl?: string;
  duration?: number;
  viewers: { userId: User; viewedAt: string }[];
  expiresAt: string;
  createdAt: string;
}

export interface CallLog {
  _id: string;
  caller: User;
  receiver: User;
  type: 'audio' | 'video';
  status: 'ongoing' | 'ended' | 'missed' | 'rejected';
  duration: number;
  createdAt: string;
}

export interface Payment {
  _id: string;
  senderId: User;
  receiverId: User;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  note?: string;
  transactionId: string;
  createdAt: string;
}
