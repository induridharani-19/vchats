# VChats Database Schema Specification (MongoDB / Mongoose)

This document describes the 16 Mongoose models that power the VChats platform.

---

## 1. User (`User.ts`)
```typescript
{
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true },
  profilePhoto: { type: String, default: '' },
  about: { type: String, default: 'Hey there! I am using VChats.' },
  bio: { type: String, default: '' },
  birthday: { type: Date },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  themePreference: { type: String, enum: ['light', 'dark'], default: 'dark' },
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isBusinessAccount: { type: Boolean, default: false },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  favoriteContacts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  starredMessages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  twoFactorEnabled: { type: Boolean, default: false },
  chatLockPin: { type: String, default: '' },
  secretCode: { type: String, default: '' }
}
```

## 2. Message (`Message.ts`)
```typescript
{
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'poll', 'payment'],
    default: 'text'
  },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  seenBy: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, time: { type: Date } }],
  deliveredTo: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, time: { type: Date } }],
  reactions: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  pollOptions: [{ id: String, text: String, votes: [{ type: Schema.Types.ObjectId, ref: 'User' }] }],
  isViewOnce: { type: Boolean, default: false },
  isViewedOnce: { type: Boolean, default: false },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  forwarded: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false },
  isDisappearing: { type: Boolean, default: false },
  disappearsAt: { type: Date }
}
```

## 3. Conversation (`Conversation.ts`)
```typescript
{
  type: { type: String, enum: ['direct', 'group', 'channel'], required: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
  channelId: { type: Schema.Types.ObjectId, ref: 'Channel' },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  unreadCount: { type: Map, of: Number },
  isPinned: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isArchived: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isMuted: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}
```

## 4. Group (`Group.ts`)
```typescript
{
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, unique: true },
  announcementOnly: { type: Boolean, default: false },
  requireApproval: { type: Boolean, default: false }
}
```

## 5. Channel (`Channel.ts`)
```typescript
{
  name: { type: String, required: true },
  description: { type: String, default: '' },
  avatar: { type: String, default: '' },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isVerified: { type: Boolean, default: false }
}
```

## 6. Story / Status (`Story.ts`)
```typescript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mediaUrl: { type: String, default: '' },
  caption: { type: String, default: '' },
  type: { type: String, enum: ['image', 'video', 'text', 'audio'], default: 'image' },
  duration: { type: Number, default: 24 }, // in hours
  viewers: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, viewedAt: Date }],
  expiresAt: { type: Date, required: true }
}
```

## 7. Call (`Call.ts`)
```typescript
{
  callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['audio', 'video'], required: true },
  status: { type: String, enum: ['ongoing', 'ended', 'missed', 'rejected'], default: 'ongoing' },
  duration: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now }
}
```

## 8. Payment (`Payment.ts`)
```typescript
{
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  note: { type: String, default: '' },
  transactionId: { type: String, unique: true }
}
```

## 9. BusinessProfile (`BusinessProfile.ts`)
```typescript
{
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  category: { type: String, default: 'General' },
  hours: { type: String, default: 'Mon-Fri 9AM - 5PM' },
  catalog: [{ id: String, name: String, price: Number, description: String, imageUrl: String }],
  quickReplies: [{ keyword: String, message: String }]
}
```

## 10. Report (`Report.ts`)
```typescript
{
  reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
}
```
