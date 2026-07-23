import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Activity,
  Phone,
  Settings,
  Shield,
  LogOut,
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  Mic,
  Video,
  Trash2,
  Edit3,
  Check,
  CheckCheck,
  User as UserIcon,
  Users,
  ArrowLeft,
  X,
  Clock,
  Image,
  FileText,
  FolderClosed,
  Info,
  Music,
  Sliders,
  RotateCw,
  Crop,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ArrowDown,
  MoreVertical,
  Star,
  ListPlus,
  Link,
  Calendar,
  AlertTriangle,
  UserX,
  CheckSquare,
  Fingerprint,
  Monitor,
  Globe,
  Download,
  Smartphone,
  Minimize2,
  Maximize2
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

import { RootState } from '../redux/store';
import { logoutSuccess, updateUser } from '../redux/authSlice';
import { getTranslation } from '../utils/translations';
import {
  setActiveConversation,
  setConversations,
  setMessages,
  addMessage,
  updateConversation,
  deleteMessage,
  removeConversation,
  clearChatState
} from '../redux/chatSlice';
import { startCall, acceptCall, endCall } from '../redux/callSlice';

import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { User, Conversation, Message, Story } from '../types';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

const getRandomAvatar = (seed: string = 'User', gender?: string) => {
  const name = (seed || 'User').trim();
  const initial = (name.charAt(0) || 'U').toUpperCase();
  
  let bgGradient = ['#0f766e', '#14b8a6'];
  let iconSvg = '';

  const cleanGender = (gender || '').toLowerCase();
  if (cleanGender === 'female') {
    bgGradient = ['#831843', '#ec4899'];
    iconSvg = `<circle cx="50" cy="38" r="18" fill="white" opacity="0.95"/>
    <path d="M 50,38 C 44,28 34,32 30,42 C 34,44 42,42 50,38 Z" fill="%23ec4899"/>
    <path d="M 22,82 C 22,62 34,56 50,56 C 66,56 78,62 78,82 Z" fill="white" opacity="0.95"/>`;
  } else if (cleanGender === 'male') {
    bgGradient = ['#1e3a8a', '#3b82f6'];
    iconSvg = `<circle cx="50" cy="38" r="18" fill="white" opacity="0.95"/>
    <path d="M 32,24 C 42,16 58,16 68,24 C 64,20 50,18 32,24 Z" fill="%233b82f6"/>
    <path d="M 22,82 C 22,62 34,56 50,56 C 66,56 78,62 78,82 Z" fill="white" opacity="0.95"/>`;
  } else {
    const colors = [
      ['#0f766e', '#14b8a6'],
      ['#581c87', '#a855f7'],
      ['#1e3a8a', '#3b82f6'],
      ['#831843', '#ec4899'],
      ['#7c2d12', '#f97316'],
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    bgGradient = colors[Math.abs(hash) % colors.length];
    
    iconSvg = `<text x="50" y="64" font-size="42" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="white" text-anchor="middle">${initial}</text>`;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="30" fill="url(#g)"/>
    ${iconSvg}
  </svg>`.replace(/\n/g, '').replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

const getFileUrl = (url?: string, seedName?: string, gender?: string) => {
  if (!url || typeof url !== 'string') {
    return seedName ? getRandomAvatar(seedName, gender) : DEFAULT_AVATAR;
  }
  
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
    return seedName ? getRandomAvatar(seedName, gender) : DEFAULT_AVATAR;
  }

  // Detect data URI anywhere in the string or if it starts with data: or blob:
  const dataIndex = trimmed.toLowerCase().indexOf('data:image');
  if (dataIndex !== -1) {
    return trimmed.substring(dataIndex);
  }
  if (trimmed.toLowerCase().startsWith('data:') || trimmed.toLowerCase().startsWith('blob:')) {
    return trimmed;
  }

  // Full HTTP/HTTPS URLs (e.g. Cloudinary)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  let backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5050/api/v1').replace('/api/v1', '');
  if (!backendBase.endsWith('/')) {
    backendBase = backendBase + '/';
  }

  const cleanUrl = trimmed.startsWith('/') ? trimmed.substring(1) : trimmed;
  return `${backendBase}${cleanUrl}`;
};

const getConversationTitle = (conv: Conversation, currentUserId: string) => {
  if (conv.type === 'group') return conv.groupId?.name || 'Group Chat';
  const peer = conv.participants.find((p) => {
    const pId = typeof p === 'object' ? p._id || (p as any).id : p;
    return pId && currentUserId && pId.toString() !== currentUserId.toString();
  }) || conv.participants.find((p) => {
    const pId = typeof p === 'object' ? p._id || (p as any).id : p;
    return pId;
  });
  return typeof peer === 'object' && peer ? peer.displayName || peer.username : 'Direct Chat';
};

const getConversationAvatar = (conv: Conversation, currentUserId: string) => {
  if (conv.type === 'group') return conv.groupId?.avatar || '';
  const peer = conv.participants.find((p) => {
    const pId = typeof p === 'object' ? p._id || (p as any).id : p;
    return pId && currentUserId && pId.toString() !== currentUserId.toString();
  }) || conv.participants.find((p) => {
    const pId = typeof p === 'object' ? p._id || (p as any).id : p;
    return pId;
  });
  return typeof peer === 'object' && peer ? peer.profilePhoto : '';
};

const ChatDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socket = useSocket();

  // Redux States
  const { user } = useSelector((state: RootState) => state.auth);
  const currentUserId = user?._id || (user as any)?.id || '';
  const { conversations, activeConversation, messages, onlineUsers, typingStatus } = useSelector(
    (state: RootState) => state.chat
  );
  const callState = useSelector((state: RootState) => state.call);

  // WebRTC calling Hook
  const {
    localStream,
    remoteStream,
    remoteStreams,
    isSharingScreen,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    peerStates,
    hasMultipleCameras,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    flipCamera,
    toggleScreenShare,
    hangup
  } = useWebRTC(socket);

  // Local UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);

  // New Chat/Group/Channel forms
  const [userSearchResult, setUserSearchResult] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);

  // Status Story Feed
  const [storyFeed, setStoryFeed] = useState<any[]>([]);

  // Settings Forms
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [about, setAbout] = useState(user?.about || '');
  const [bio, setBio] = useState(user?.bio || '');

  // Message Options / Interactions
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [selectedMessageFile, setSelectedMessageFile] = useState<File | null>(null);

  // Call Minimization State
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  // Public configurations state for branding & ads
  const [publicConfig, setPublicConfig] = useState<{
    appName: string;
    appLogo: string;
    accentColor: string;
    showAds: boolean;
    adImageUrl: string;
    adTargetUrl: string;
    adText: string;
  } | null>(null);

  useEffect(() => {
    const loadPublicConfig = async () => {
      try {
        const res = await api.get('/admin/config/public');
        if (res.data && res.data.config) {
          setPublicConfig(res.data.config);
          const { accentColor } = res.data.config;
          if (accentColor) {
            document.documentElement.style.setProperty('--color-brand-teal', accentColor);
            document.documentElement.style.setProperty('--color-brand-teal-light', accentColor + 'dd');
            document.documentElement.style.setProperty('--color-brand-teal-dark', accentColor);
          }
        }
      } catch (err) {
        console.error('Failed to load branding configs in dashboard:', err);
      }
    };
    loadPublicConfig();
  }, []);

  // Status Story Upload / Editor / Player States
  const [showStoryUploadModal, setShowStoryUploadModal] = useState(false);
  const [storyUploadMediaType, setStoryUploadMediaType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [selectedStoryFile, setSelectedStoryFile] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [storyBackground, setStoryBackground] = useState('#00B69B');
  const [storyUploadDuration, setStoryUploadDuration] = useState<number>(30); // play duration in seconds (10, 30, 60)
  
  // Spotify-style Music Search States
  const [selectedSong, setSelectedSong] = useState<{
    title: string;
    artist: string;
    albumArt: string;
    previewUrl: string;
  } | null>(null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicSearchResults, setMusicSearchResults] = useState<any[]>([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [playingPreviewTrack, setPlayingPreviewTrack] = useState<string | null>(null);
  
  // Image Editor (Crop/Filter/Rotate) States
  const [showImageEditorModal, setShowImageEditorModal] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [blurVal, setBlurVal] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [cropX, setCropX] = useState(10);
  const [cropY, setCropY] = useState(10);
  const [cropW, setCropW] = useState(80);
  const [cropH, setCropH] = useState(80);

  // Peer Profile Sidebar State
  const [showPeerProfileSidebar, setShowPeerProfileSidebar] = useState(false);

  // Call History States
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [activeCallLogId, setActiveCallLogId] = useState<string | null>(null);

  // Chats Filter state
  const [chatsFilter, setChatsFilter] = useState<string>('all');

  // Custom Options Menu / WhatsApp-style Dropdown States and Refs
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  
  // Disappearing messages state
  const [disappearingDurations, setDisappearingDurations] = useState<{[convId: string]: number}>(() => {
    try {
      const saved = localStorage.getItem('vchats_disappearing_durations');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [selectedDisappearingDuration, setSelectedDisappearingDuration] = useState(0); // in seconds
  
  // Custom lists state
  const [customLists, setCustomLists] = useState<{[listName: string]: string[]}>(() => {
    try {
      const saved = localStorage.getItem('vchats_custom_lists');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState('');
  
  // Scheduled call state
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const [scheduledCallDate, setScheduledCallDate] = useState('');
  const [scheduledCallTime, setScheduledCallTime] = useState('');
  const [scheduledCallType, setScheduledCallType] = useState<'voice' | 'video'>('video');
  
  // Report state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Settings Sub-pages States
  const [activeSettingSubPage, setActiveSettingSubPage] = useState<'main' | 'language' | 'general' | 'profile' | 'account' | 'privacy' | 'chats' | 'video-voice' | 'notifications' | 'shortcuts' | 'help'>('main');
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');

  // Locked Chat States
  const [isLockedChatsUnlocked, setIsLockedChatsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'verify' | 'setup' | 'confirm'>('verify');
  const [pinInput, setPinInput] = useState('');
  const [firstPinInput, setFirstPinInput] = useState('');
  const [targetLockConv, setTargetLockConv] = useState<any | null>(null);
  const [biometricUnlockStatus, setBiometricUnlockStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [callReactions, setCallReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [activeVideoFilter, setActiveVideoFilter] = useState<'none' | 'grayscale' | 'sepia' | 'blur' | 'beauty'>('none');
  const [showVideoFiltersMenu, setShowVideoFiltersMenu] = useState(false);

  // Layout and Device Mode Preferences
  const [layoutMode, setLayoutMode] = useState<'responsive' | 'mobile' | 'desktop' | 'mockup'>(
    () => (localStorage.getItem('vchats_layout_mode') as any) || 'responsive'
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const isMobileView =
    layoutMode === 'mobile' ||
    layoutMode === 'mockup' ||
    (layoutMode === 'responsive' && windowWidth < 768);

  // Group Edit States
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadMessageCountAfterScroll, setUnreadMessageCountAfterScroll] = useState(0);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [mediaTab, setMediaTab] = useState<'media' | 'docs' | 'links'>('media');

  // Recording States
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingCaption, setRecordingCaption] = useState('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Crop & Adjust States
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1.0);
  const [cropPosX, setCropPosX] = useState(0);
  const [cropPosY, setCropPosY] = useState(0);
  const [cropBlur, setCropBlur] = useState(0);
  const [cropRotation, setCropRotation] = useState(0);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [selectedGroupAvatarFile, setSelectedGroupAvatarFile] = useState<File | null>(null);

  // Story Viewer Modal Active Group / Index
  const [activeStoryGroup, setActiveStoryGroup] = useState<{ user: User; stories: Story[] } | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [storyViewerRemainingSeconds, setStoryViewerRemainingSeconds] = useState<number>(5);
  const [isMutedStory, setIsMutedStory] = useState(false);
  const storyAudioRef = useRef<HTMLAudioElement>(null);
  const storyMediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  // Call duration counter
  const [callDuration, setCallDuration] = useState(0);
  const [showMobileChatActive, setShowMobileChatActive] = useState(false);

  useEffect(() => {
    if (activeConversation) {
      setShowMobileChatActive(true);
    }
  }, [activeConversation?._id]);

  // Expanded Feature States
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'status' | 'calls' | 'settings'>('chats');
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [showShareContactModal, setShowShareContactModal] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'gallery' | 'document' | 'audio'>('gallery');
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = (type: 'gallery' | 'document' | 'audio') => {
    setAttachmentType(type);
    setShowAttachmentDropdown(false);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.click();
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMessageFile(file);
    }
  };

  const getAcceptAttribute = () => {
    if (attachmentType === 'gallery') return 'image/*,video/*';
    if (attachmentType === 'audio') return 'audio/*';
    return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar';
  };
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([
    {
      _id: 'ai-welcome',
      senderId: { _id: 'ai-bot', displayName: 'VChats AI Assistant', username: 'ai_assistant' },
      content: `Hello! 👋 I am your VChats AI Assistant.

How can I help you today? You can type:
* **"Help"** to see my capabilities.
* **"Translate 'Welcome to the future'"** to see mock translation outputs.
* **"Summarize this thread"** to view a chat summary.
* **"Write a typescript function"** to get a code snippet!`,
      createdAt: new Date().toISOString()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSocketRoomRef = useRef<string | null>(null);

  // Unlock private chats when search query matches secure PIN
  useEffect(() => {
    if (searchQuery.length === 4 && /^\d{4}$/.test(searchQuery)) {
      if (user?.chatLockPin && searchQuery === user.chatLockPin) {
        setIsLockedChatsUnlocked(true);
        setSearchQuery('');
        alert("Private chats unlocked successfully!");
      }
    }
  }, [searchQuery, user?.chatLockPin]);

  // Listen for in-call reactions
  useEffect(() => {
    if (socket) {
      const handleReaction = ({ reaction }: { reaction: string }) => {
        const id = Date.now().toString() + Math.random().toString();
        setCallReactions((prev) => [...prev, { id, emoji: reaction }]);
        setTimeout(() => {
          setCallReactions((prev) => prev.filter((r) => r.id !== id));
        }, 3000);
      };
      
      socket.on('call-reaction', handleReaction);
      
      return () => {
        socket.off('call-reaction', handleReaction);
      };
    }
  }, [socket]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sendCallReaction = (emoji: string) => {
    if (socket && callState.peerUser) {
      socket.emit('call-reaction', {
        targetUserId: callState.peerUser.id,
        reaction: emoji,
      });
      const id = Date.now().toString() + Math.random().toString();
      setCallReactions((prev) => [...prev, { id, emoji }]);
      setTimeout(() => {
        setCallReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    }
  };

  const getVideoFilterStyle = () => {
    switch (activeVideoFilter) {
      case 'grayscale':
        return 'grayscale(1) contrast(1.2)';
      case 'sepia':
        return 'sepia(0.8) hue-rotate(-15deg)';
      case 'blur':
        return 'blur(6px)';
      case 'beauty':
        return 'brightness(1.08) contrast(1.05) saturate(1.12) blur(0.1px)';
      default:
        return 'none';
    }
  };

  // Auto Scroll to Message Bottom
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadMessageCountAfterScroll(0);
    } else {
      setUnreadMessageCountAfterScroll((prev) => prev + 1);
    }
  }, [messages]);

  // Reset sidebars and scroll helper states on chat switch
  useEffect(() => {
    setShowPeerProfileSidebar(false);
    setShowMediaBrowser(false);
    setMediaTab('media');
    setUnreadMessageCountAfterScroll(0);
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeConversation]);

  // Click outside listener for WhatsApp-style options dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuDropdown]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
    setUnreadMessageCountAfterScroll(0);
  };

  const handleChatScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    setShowScrollBottomBtn(!isAtBottom);
    if (isAtBottom) {
      setUnreadMessageCountAfterScroll(0);
    }
  };

  const fetchCallLogs = async () => {
    try {
      const res = await api.get('/calls/history');
      setCallLogs(res.data.calls || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs();
    }
  }, [activeTab]);

  const handleDeleteCallLog = async (callId: string) => {
    try {
      await api.delete(`/calls/${callId}`);
      setCallLogs((prev) => prev.filter((log) => log._id !== callId));
    } catch (error) {
      console.error('Error deleting call log:', error);
    }
  };

  const handleClearCallLogs = async () => {
    try {
      await api.delete('/calls/clear');
      setCallLogs([]);
    } catch (error) {
      console.error('Error clearing call logs:', error);
    }
  };

  const handleToggleFavoriteChat = async (conv: any) => {
    try {
      const res = await api.post(`/chats/${conv._id}/favorite`);
      const updatedConversations = conversations.map((c) =>
        c._id === conv._id
          ? {
              ...c,
              favorites: res.data.favorite
                ? [...(c.favorites || []), currentUserId]
                : (c.favorites || []).filter((id) => id !== currentUserId),
            }
          : c
      );
      dispatch(setConversations(updatedConversations));
    } catch (error) {
      console.error('Error favoriting chat:', error);
    }
  };

  const handleToggleLockChat = async (conv: any) => {
    if (!user?.chatLockPin) {
      setTargetLockConv(conv);
      setPinModalMode('setup');
      setPinInput('');
      setShowPinModal(true);
      return;
    }

    try {
      const res = await api.post(`/chats/${conv._id}/lock`);
      const updatedConversations = conversations.map((c) =>
        c._id === conv._id
          ? {
              ...c,
              lockedBy: res.data.locked
                ? [...(c.lockedBy || []), currentUserId]
                : (c.lockedBy || []).filter((id: string) => id !== currentUserId),
            }
          : c
      );
      dispatch(setConversations(updatedConversations));
      
      if (res.data.locked && !isLockedChatsUnlocked) {
        dispatch(setActiveConversation(null));
      }
    } catch (error) {
      console.error('Error locking chat:', error);
    }
  };

  const handleBiometricUnlock = () => {
    setBiometricUnlockStatus('scanning');
    
    // Simulate fingerprint scanner
    setTimeout(() => {
      if (user?.chatLockPin) {
        setBiometricUnlockStatus('success');
        setTimeout(() => {
          setIsLockedChatsUnlocked(true);
          setShowPinModal(false);
          setBiometricUnlockStatus('idle');
        }, 1000);
      } else {
        setBiometricUnlockStatus('failed');
        alert("No Secure PIN configured. Please set up your PIN first.");
        setTimeout(() => {
          setBiometricUnlockStatus('idle');
        }, 1000);
      }
    }, 1500);
  };

  const handleLockedChatsClick = () => {
    if (isLockedChatsUnlocked) {
      return;
    }
    if (!user?.chatLockPin) {
      setPinModalMode('setup');
      setPinInput('');
      setShowPinModal(true);
    } else {
      setPinModalMode('verify');
      setPinInput('');
      setShowPinModal(true);
      
      // Auto-trigger biometric scan!
      handleBiometricUnlock();
    }
  };

  const handleKeypadPress = (num: string) => {
    if (pinInput.length < 4) {
      setPinInput((prev) => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;

    if (pinModalMode === 'setup') {
      setFirstPinInput(pinInput);
      setPinInput('');
      setPinModalMode('confirm');
    } else if (pinModalMode === 'confirm') {
      if (pinInput !== firstPinInput) {
        alert("PINs do not match! Please try again.");
        setPinInput('');
        setPinModalMode('setup');
        return;
      }
      try {
        await api.post('/users/lock-pin', { pin: pinInput });
        if (user) {
          dispatch(updateUser({ ...user, chatLockPin: pinInput }));
        }
        alert("Security PIN configured successfully!");
        setShowPinModal(false);

        if (targetLockConv) {
          handleToggleLockChat(targetLockConv);
          setTargetLockConv(null);
        }
      } catch (error) {
        console.error("Error setting PIN:", error);
      }
    } else if (pinModalMode === 'verify') {
      try {
        const res = await api.post('/users/verify-pin', { pin: pinInput });
        if (res.data.verified) {
          setIsLockedChatsUnlocked(true);
          setShowPinModal(false);
        } else {
          alert("Incorrect Security PIN! Access Denied.");
          setPinInput('');
        }
      } catch (error) {
        console.error("Error verifying PIN:", error);
      }
    }
  };

  // Handle Call Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (callState.callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState.callStatus]);

  // Synchronize call logs with backend database status
  useEffect(() => {
    const dbId = callState.callLogId || activeCallLogId;
    if (!dbId) return;

    if (callState.callStatus === 'connected') {
      api.patch(`/calls/log/${dbId}`, { status: 'connected' }).catch(console.error);
    } else if (callState.callStatus === 'ended') {
      let finalStatus = 'ended';
      if (callDuration === 0) {
        finalStatus = callState.isCaller ? 'missed' : 'rejected';
      }
      api.patch(`/calls/log/${dbId}`, {
        status: finalStatus,
        duration: callDuration,
        endedAt: new Date()
      })
        .then(() => {
          setActiveCallLogId(null);
          if (activeTab === 'calls') {
            fetchCallLogs();
          }
        })
        .catch(console.error);
    }
  }, [callState.callStatus, callState.callLogId, activeCallLogId]);

  // Reset local call toggles when call resets
  useEffect(() => {
    if (callState.callStatus === 'idle' || callState.callStatus === 'ended') {
      setIsCallMinimized(false);
    }
  }, [callState.callStatus]);

  // Dynamic App Light/Dark Mode toggle
  useEffect(() => {
    const root = window.document.documentElement;
    const theme = user?.themePreference || 'dark';
    if (theme === 'light') {
      root.classList.add('light-mode');
    } else {
      root.classList.remove('light-mode');
    }
  }, [user?.themePreference]);

  // Load User Profile on mount/refresh if missing
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/users/profile');
        dispatch(updateUser(res.data.user));
      } catch (err) {
        console.error('Failed to load user profile on mount', err);
      }
    };
    if (localStorage.getItem('accessToken')) {
      fetchUserProfile();
    }
  }, [dispatch]);

  // Load Conversations and Statuses
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const chatsRes = await api.get('/chats');
        dispatch(setConversations(chatsRes.data.conversations));

        const feedRes = await api.get('/status/feed');
        setStoryFeed(feedRes.data.feed);
      } catch (err) {
        console.error('Failed to load initial chat logs', err);
      }
    };
    fetchInitialData();
  }, [dispatch, activeTab]);

  // Join Socket Room for Active Conversation
  useEffect(() => {
    if (socket && activeConversation) {
      // Leave old room
      if (chatSocketRoomRef.current) {
        socket.emit('leave-room', chatSocketRoomRef.current);
      }

      // Join new room
      socket.emit('join-room', activeConversation._id);
      chatSocketRoomRef.current = activeConversation._id;

      // Load Messages
      const fetchMessages = async () => {
        if (activeConversation._id === 'ai-assistant') {
          dispatch(setMessages([]));
          return;
        }
        try {
          const res = await api.get(`/chats/${activeConversation._id}/messages`);
          dispatch(setMessages(res.data.messages));
          await api.patch(`/messages/${activeConversation._id}/seen`).catch(console.error);
        } catch (err) {
          console.error(err);
        }
      };
      fetchMessages();
    }
  }, [activeConversation, socket, dispatch]);

  // Mark new messages seen as they arrive in real-time
  useEffect(() => {
    const currentMessages = messages || [];
    if (activeConversation && activeConversation._id !== 'ai-assistant' && currentMessages.length > 0) {
      const lastMessage = currentMessages[currentMessages.length - 1];
      const isPeerMessage = lastMessage.senderId._id !== currentUserId && lastMessage.senderId !== currentUserId;
      const alreadySeen = lastMessage.seenBy?.some((s: any) => {
        const sUid = typeof s === 'object' ? s.userId?._id || s.userId || s : s;
        return sUid === currentUserId;
      });
      
      if (isPeerMessage && !alreadySeen) {
        api.patch(`/messages/${activeConversation._id}/seen`).catch(console.error);
      }
    }
  }, [messages, activeConversation, currentUserId]);

  // Typing indicators
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (socket && activeConversation && user) {
      if (e.target.value.length > 0) {
        socket.emit('typing', { conversationId: activeConversation._id, username: user.username });
      } else {
        socket.emit('stop-typing', { conversationId: activeConversation._id });
      }
    }
  };


  const getTypingText = () => {
    if (!activeConversation || !typingStatus?.[activeConversation._id]) return null;
    const typingUsers = Object.values(typingStatus[activeConversation._id]).filter(
      (username) => username && username !== user?.username
    );
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  const isPeerTyping = () => {
    if (!activeConversation || !typingStatus?.[activeConversation._id] || activeConversation.type === 'group') return false;
    const typingUsers = Object.keys(typingStatus[activeConversation._id]).filter(
      (uid) => uid !== currentUserId
    );
    return typingUsers.length > 0;
  };

  // Trigger outbound call
  const triggerCall = (type: 'voice' | 'video') => {
    if (!socket || !activeConversation || !user) return;

    const callId = Math.random().toString(36).substr(2, 9);

    if (activeConversation.type === 'group') {
      dispatch(
        startCall({
          receiver: {
            id: 'group',
            username: 'group',
            displayName: activeConversation.groupId?.name || 'Group Call',
            profilePhoto: activeConversation.groupId?.avatar || '',
          },
          callType: type,
          callId,
          conversationId: activeConversation._id,
        })
      );

      const participants = activeConversation.participants.map((p: any) => p._id || p);
      socket.emit('group-call-start', {
        participants,
        callType: type,
        callId,
        conversationId: activeConversation._id,
        groupName: activeConversation.groupId?.name || 'Group Call',
      });

      api.post('/calls/log', {
        conversationId: activeConversation._id,
        type,
        status: 'initiated',
        duration: 0,
      })
        .then((res) => {
          if (res.data?.call?._id) {
            setActiveCallLogId(res.data.call._id);
          }
        })
        .catch(console.error);

    } else {
      const receiver = activeConversation.participants.find((p) => {
        const pId = typeof p === 'object' ? p._id || (p as any).id : p;
        return pId && currentUserId && pId.toString() !== currentUserId.toString();
      });
      const receiverId = typeof receiver === 'object' && receiver ? (receiver._id || (receiver as any).id) : receiver;
      if (!receiverId) return;

      dispatch(
        startCall({
          receiver: {
            id: receiverId,
            username: typeof receiver === 'object' ? receiver.username : '',
            displayName: typeof receiver === 'object' ? receiver.displayName : '',
            profilePhoto: typeof receiver === 'object' ? receiver.profilePhoto : '',
          },
          callType: type,
          callId,
          conversationId: activeConversation._id,
        })
      );

      socket.emit('call-start', {
        targetUserId: receiverId,
        callType: type,
        callId,
        conversationId: activeConversation._id,
      });

      api.post('/calls/log', {
        receiverId: receiverId,
        conversationId: activeConversation._id,
        type,
        status: 'initiated',
        duration: 0,
      })
        .then((res) => {
          if (res.data?.call?._id) {
            setActiveCallLogId(res.data.call._id);
          }
        })
        .catch(console.error);
    }
  };

  // Answer call
  const handleAnswerCall = () => {
    if (socket && callState.peerUser) {
      dispatch(acceptCall());
    }
  };

  // Reject Call
  const handleRejectCall = () => {
    if (socket && callState.peerUser) {
      socket.emit('call-reject', { callerId: callState.peerUser.id, callId: callState.callId });
      dispatch(endCall());
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !selectedMessageFile) return;

    if (activeConversation?._id === 'ai-assistant') {
      const userMsg = {
        _id: 'user-' + Date.now(),
        senderId: { _id: user?._id || (user as any)?.id, username: user?.username, displayName: user?.displayName },
        content: messageInput,
        createdAt: new Date().toISOString()
      };
      setAiMessages(prev => [...prev, userMsg]);
      const input = messageInput;
      setMessageInput('');

      try {
        const res = await api.post('/ai/chat', { 
          message: input,
          language: localStorage.getItem('vchats_language') || 'en'
        });
        const aiMsg = {
          _id: 'ai-' + Date.now(),
          senderId: { _id: 'ai-bot', displayName: 'VChats AI Assistant', username: 'ai_assistant' },
          content: res.data.reply,
          createdAt: new Date().toISOString()
        };
        setAiMessages(prev => [...prev, aiMsg]);
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (!activeConversation || !activeConversation._id || activeConversation._id === 'undefined') {
      alert('Please select a valid conversation first.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('conversationId', activeConversation._id);
      formData.append('content', messageInput || '');
      formData.append('type', selectedMessageFile ? 'image' : 'text');
      if (replyMessage && replyMessage._id) {
        formData.append('replyTo', replyMessage._id);
      }
      if (selectedMessageFile) {
        formData.append('file', selectedMessageFile);
      }
      if (scheduledTime) {
        formData.append('scheduledFor', scheduledTime);
      }
      
      const disappearingDuration = disappearingDurations[activeConversation?._id || ''];
      if (disappearingDuration && disappearingDuration > 0) {
        formData.append('disappearingTime', disappearingDuration.toString());
      }

      const res = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!scheduledTime) {
        dispatch(addMessage(res.data.message));
      } else {
        alert('Message scheduled successfully!');
      }

      // Reset
      setMessageInput('');
      setSelectedMessageFile(null);
      setReplyMessage(null);
      setScheduledTime(null);
      if (socket && activeConversation) {
        socket.emit('stop-typing', { conversationId: activeConversation._id });
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Trigger Search user
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setUserSearchResult([]);
      return;
    }
    try {
      const res = await api.get(`/users/search?query=${query}`);
      setUserSearchResult(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  // Start Direct Chat
  const startDirectChat = async (targetId: string) => {
    try {
      const res = await api.post('/chats/direct', { targetUserId: targetId });
      dispatch(updateConversation(res.data.conversation));
      dispatch(setActiveConversation(res.data.conversation));
      setShowMobileChatActive(true);
      setShowNewChatModal(false);
      setSearchQuery('');
      setUserSearchResult([]);
    } catch (err) {
      alert('Failed to start chat. Check blocked users list.');
    }
  };

  // Create Group
  const handleCreateGroup = async () => {
    if (!groupName || groupMembers.length === 0) return;
    try {
      const res = await api.post('/groups/create', {
        name: groupName,
        memberIds: groupMembers,
      });
      dispatch(updateConversation(res.data.conversation));
      dispatch(setActiveConversation(res.data.conversation));
      setShowMobileChatActive(true);
      setShowNewGroupModal(false);
      setGroupName('');
      setGroupMembers([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Channel (Commented out because it is currently unused in the UI)
  /*
  const handleCreateChannel = async () => {
    if (!channelName) return;
    try {
      const res = await api.post('/channels/create', {
        name: channelName,
        description: channelDescription,
      });
      alert(`Channel @${res.data.channel.name} created!`);
      setShowNewChannelModal(false);
      setChannelName('');
      setChannelDescription('');
    } catch (err) {
      alert('Channel name taken.');
    }
  };
  */

  // Create Story (Commented out because it is currently unused in the UI)
  /*
  const handleUploadStory = async () => {
    try {
      const formData = new FormData();
      formData.append('mediaType', storyType);
      if (storyType === 'text') {
        formData.append('textContent', storyTextContent);
      } else if (storyFile) {
        formData.append('media', storyFile);
      }

      await api.post('/status/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowStoryUploadModal(false);
      setStoryTextContent('');
      setStoryFile(null);
      // Reload stories
      const feedRes = await api.get('/status/feed');
      setStoryFeed(feedRes.data.feed);
    } catch (err) {
      console.error(err);
    }
  };
  */

  // Update profile setting details
  const handleUpdateProfileSettings = async () => {
    try {
      const themePref = user?.themePreference || 'dark';
      await api.patch('/users/profile', {
        displayName,
        about,
        bio,
        themePreference: themePref,
      });
      dispatch(updateUser({ ...user, displayName, about, bio, themePreference: themePref } as User));
      alert('Profile details updated successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post('/users/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      dispatch(updateUser({ ...user, profilePhoto: res.data.profilePhoto } as User));
      alert('Profile photo updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload profile photo.');
    }
  };

  // Music & Story Search and composing handlers
  const handleSearchMusic = async (query: string) => {
    setMusicSearchQuery(query);
    if (!query.trim()) {
      setMusicSearchResults([]);
      return;
    }
    setIsSearchingMusic(true);
    try {
      const res = await api.get(`/status/search-songs?query=${encodeURIComponent(query)}`);
      setMusicSearchResults(res.data.songs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const handleSaveEditedImage = () => {
    if (!imageToEdit) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.src = imageToEdit;
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      const absX = (cropX / 100) * origW;
      const absY = (cropY / 100) * origH;
      const absW = (cropW / 100) * origW;
      const absH = (cropH / 100) * origH;

      canvas.width = absW;
      canvas.height = absH;

      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blurVal}px)`;
        
        if (rotation !== 0) {
          ctx.translate(absW / 2, absH / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, absX, absY, absW, absH, -absW / 2, -absH / 2, absW, absH);
        } else {
          ctx.drawImage(img, absX, absY, absW, absH, 0, 0, absW, absH);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
            setSelectedStoryFile(file);
            setShowImageEditorModal(false);
          }
        }, 'image/jpeg', 0.9);
      }
    };
  };

  const handleUploadStory = async () => {
    try {
      const formData = new FormData();
      formData.append('mediaType', storyUploadMediaType);
      formData.append('caption', storyCaption);
      formData.append('background', storyBackground);
      formData.append('duration', storyUploadDuration.toString());
      
      if (storyUploadMediaType !== 'text' && selectedStoryFile) {
        formData.append('media', selectedStoryFile);
      } else if (storyUploadMediaType === 'text' && !storyCaption.trim()) {
        alert('Please enter some text status.');
        return;
      }

      if (selectedSong) {
        formData.append('songTitle', selectedSong.title);
        formData.append('songArtist', selectedSong.artist);
        formData.append('songAlbumArt', selectedSong.albumArt);
        formData.append('songPreviewUrl', selectedSong.previewUrl);
      }

      await api.post('/status/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowStoryUploadModal(false);
      setStoryCaption('');
      setSelectedStoryFile(null);
      setSelectedSong(null);
      setStoryUploadDuration(30);
      
      // Reset image filters
      setBrightness(100);
      setContrast(100);
      setGrayscale(0);
      setSepia(0);
      setBlurVal(0);
      setRotation(0);
      setCropX(10);
      setCropY(10);
      setCropW(80);
      setCropH(80);

      // Reload stories
      const feedRes = await api.get('/status/feed');
      setStoryFeed(feedRes.data.feed);
      alert('Status uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload status.');
    }
  };

  const handleViewStory = async (storyId: string) => {
    try {
      await api.post(`/status/${storyId}/view`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      const currentUserIndex = storyFeed.findIndex((item) => item.user._id === activeStoryGroup.user._id);
      if (currentUserIndex !== -1 && currentUserIndex < storyFeed.length - 1) {
        setActiveStoryGroup(storyFeed[currentUserIndex + 1]);
        setActiveStoryIndex(0);
      } else {
        setActiveStoryGroup(null);
        setActiveStoryIndex(0);
      }
    }
  };

  const handlePrevStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else {
      const currentUserIndex = storyFeed.findIndex((item) => item.user._id === activeStoryGroup.user._id);
      if (currentUserIndex > 0) {
        const prevGroup = storyFeed[currentUserIndex - 1];
        setActiveStoryGroup(prevGroup);
        setActiveStoryIndex(prevGroup.stories.length - 1);
      } else {
        setActiveStoryIndex(0);
      }
    }
  };

  // Story Playback Timer
  useEffect(() => {
    if (!activeStoryGroup) {
      setStoryViewerRemainingSeconds(5);
      return;
    }

    const story = activeStoryGroup.stories[activeStoryIndex];
    if (!story) return;

    // Mark as viewed
    handleViewStory(story._id);

    const duration = story.duration || (story.mediaType === 'audio' || story.mediaType === 'video' ? 15 : 5);
    setStoryViewerRemainingSeconds(duration);

    const interval = setInterval(() => {
      setStoryViewerRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleNextStory();
          return duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStoryGroup, activeStoryIndex]);

  // Message options, chat deletion, theme updating, and group editing handlers
  const handleDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    if (activeConversation?._id === 'ai-assistant') {
      setAiMessages((prev) => prev.filter((m) => m._id !== messageId));
      return;
    }
    try {
      if (type === 'me') {
        await api.delete(`/messages/${messageId}/me`);
         dispatch(setMessages((messages || []).filter((m) => m._id !== messageId)));
      } else {
        if (!window.confirm('Delete this message for everyone?')) return;
        const res = await api.delete(`/messages/${messageId}/everyone`);
        dispatch(deleteMessage(res.data.message));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete message.');
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConversation) return;
    const confirmMsg = activeConversation.type === 'group'
      ? 'Are you sure you want to delete this group and all its messages?'
      : 'Are you sure you want to delete this chat and all its messages?';
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/chats/${activeConversation._id}`);
      dispatch(removeConversation(activeConversation._id));
      setShowPeerProfileSidebar(false);
      alert('Chat deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete chat.');
    }
  };

  // Handle toggling mute notifications
  const handleToggleMuteNotifications = async () => {
    if (!activeConversation) return;
    try {
      const res = await api.post(`/chats/${activeConversation._id}/mute`);
      if (res.data.status === 'success') {
        const isMutedNow = res.data.muted;
        const updatedConversation = {
          ...activeConversation,
          mutedBy: isMutedNow
            ? [...(activeConversation.mutedBy || []), currentUserId]
            : (activeConversation.mutedBy || []).filter(id => id !== currentUserId)
        };
        dispatch(updateConversation(updatedConversation));
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Mute toggle failed", err);
      alert("Failed to toggle mute notifications.");
    }
  };

  // Handle toggling block user
  const handleToggleBlockUser = async () => {
    if (!activeConversation) return;
    const peer = activeConversation.participants.find((p) => {
      const pId = typeof p === 'object' ? p._id || (p as any).id : p;
      return pId !== currentUserId;
    });
    const peerId = typeof peer === 'object' ? peer?._id : peer;
    if (!peerId) return;

    const isBlocked = user?.blockedUsers?.some((uId: any) => {
      const id = typeof uId === 'object' ? uId._id : uId;
      return id === peerId;
    });
    const url = isBlocked ? '/users/unblock' : '/users/block';
    
    if (!window.confirm(isBlocked ? "Unblock this user?" : "Block this user? Blocked users cannot send you messages.")) return;

    try {
      const res = await api.post(url, { targetUserId: peerId });
      if (res.data.status === 'success') {
        const updatedBlockedUsers = isBlocked
          ? (user?.blockedUsers || []).filter((uId: any) => {
              const id = typeof uId === 'object' ? uId._id : uId;
              return id !== peerId;
            })
          : [...(user?.blockedUsers || []), peerId];
        
        const updatedUser = {
          ...user!,
          blockedUsers: updatedBlockedUsers as any
        };
        dispatch(updateUser(updatedUser));
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Failed to block/unblock", err);
      alert("Failed to block/unblock user.");
    }
  };

  // Handle clearing chat messages for the current user
  const handleClearChat = async () => {
    if (!activeConversation) return;
    if (!window.confirm("Are you sure you want to clear all messages in this chat? This action cannot be undone.")) return;

    try {
      const res = await api.post(`/chats/${activeConversation._id}/clear`);
      if (res.data.status === 'success') {
        dispatch(setMessages([]));
        alert("Chat cleared successfully.");
      }
    } catch (err) {
      console.error("Failed to clear chat", err);
      alert("Failed to clear chat.");
    }
  };

  // Handle deleting multiple selected messages
  const handleDeleteSelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;
    if (!window.confirm(`Delete the ${selectedMessageIds.length} selected messages?`)) return;
    
    try {
      for (const msgId of selectedMessageIds) {
        await api.delete(`/messages/${msgId}/me`);
      }
      const updatedMessages = (messages || []).filter((m) => !selectedMessageIds.includes(m._id));
      dispatch(setMessages(updatedMessages));
      alert("Selected messages deleted.");
    } catch (err) {
      console.error("Failed to delete selected messages", err);
      alert("Error deleting some messages.");
    } finally {
      setIsSelectMode(false);
      setSelectedMessageIds([]);
    }
  };

  // Handle sending WebRTC call link message
  const handleSendCallLink = async () => {
    if (!activeConversation) return;
    const callId = Math.random().toString(36).substr(2, 9);
    const callUrl = `${window.location.origin}/call/${callId}`;
    const linkMessage = `Join my video/voice call room: ${callUrl}`;
    
    try {
      const formData = new FormData();
      formData.append('conversationId', activeConversation._id);
      formData.append('content', linkMessage);
      formData.append('type', 'text');
      const res = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(addMessage(res.data.message));
    } catch (err) {
      console.error("Failed to send call link", err);
      alert("Failed to send call link.");
    }
  };

  // Handle scheduling a call
  const handleCreateScheduledCall = async () => {
    if (!activeConversation) return;
    if (!scheduledCallDate || !scheduledCallTime) {
      alert("Please select date and time.");
      return;
    }
    const dateTime = `${scheduledCallDate} ${scheduledCallTime}`;
    const callId = Math.random().toString(36).substr(2, 9);
    const callUrl = `${window.location.origin}/call/${callId}`;
    const content = `📅 Scheduled ${scheduledCallType === 'video' ? 'Video' : 'Voice'} Call\nScheduled for: ${dateTime}\nJoin room: ${callUrl}`;
    
    try {
      const formData = new FormData();
      formData.append('conversationId', activeConversation._id);
      formData.append('content', content);
      formData.append('type', 'text');
      const res = await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(addMessage(res.data.message));
      setShowScheduleCallModal(false);
      setScheduledCallDate('');
      setScheduledCallTime('');
    } catch (err) {
      console.error("Failed to schedule call", err);
      alert("Failed to send scheduled call invitation.");
    }
  };

  // Handle reporting the user or group
  const handleReportEntity = async () => {
    if (!activeConversation) return;
    if (!reportReason.trim()) {
      alert("Please enter a reason for reporting.");
      return;
    }
    
    const targetId = activeConversation.type === 'group' 
      ? activeConversation.groupId?._id || activeConversation.groupId
      : (() => {
          const peer = activeConversation.participants.find((p) => {
            const pId = typeof p === 'object' ? p._id || (p as any).id : p;
            return pId !== currentUserId;
          });
          return typeof peer === 'object' ? peer?._id : peer;
        })();
        
    const type = activeConversation.type === 'group' ? 'group' : 'user';

    try {
      const res = await api.post('/users/report', {
        targetId,
        type,
        reason: reportReason
      });
      alert(res.data.message);
      setShowReportModal(false);
      setReportReason('');
    } catch (err) {
      console.error("Failed to submit report", err);
      alert("Failed to submit report.");
    }
  };

  // Handle Custom Lists
  const handleSaveCustomList = (listName: string, activeConvId: string, action: 'add' | 'remove') => {
    if (!listName.trim() || !activeConvId) return;
    
    const listConvs = customLists[listName] || [];
    let updatedConvs = [...listConvs];
    if (action === 'add') {
      if (!updatedConvs.includes(activeConvId)) {
        updatedConvs.push(activeConvId);
      }
    } else {
      updatedConvs = updatedConvs.filter(id => id !== activeConvId);
    }
    
    const updatedLists = {
      ...customLists,
      [listName]: updatedConvs
    };
    
    // Clean up empty lists
    if (action === 'remove' && updatedConvs.length === 0) {
      delete updatedLists[listName];
    }
    
    setCustomLists(updatedLists);
    localStorage.setItem('vchats_custom_lists', JSON.stringify(updatedLists));
  };


  const handleLeaveGroup = async () => {
    if (!activeConversation || activeConversation.type !== 'group' || !activeConversation.groupId) return;
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await api.post(`/groups/${activeConversation.groupId._id}/leave`);
      dispatch(removeConversation(activeConversation._id));
      setShowPeerProfileSidebar(false);
      alert('You have left the group.');
    } catch (err) {
      console.error(err);
      alert('Failed to leave group.');
    }
  };

  const handleUpdateTheme = async (themeColor: string, themeImage?: string) => {
    if (!activeConversation) return;
    try {
      const res = await api.patch(`/chats/${activeConversation._id}/theme`, {
        themeColor,
        themeImage,
      });
      dispatch(updateConversation(res.data.conversation));
    } catch (err) {
      console.error(err);
      alert('Failed to update chat theme.');
    }
  };

  const handleUploadThemeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeConversation || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropZoom(1.0);
      setCropPosX(0);
      setCropPosY(0);
      setCropBlur(0);
      setCropRotation(0);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCroppedTheme = () => {
    if (!cropImageSrc || !activeConversation) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = cropImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetWidth = 800;
      const targetHeight = 1200;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.clearRect(0, 0, targetWidth, targetHeight);

      ctx.save();
      if (cropBlur > 0) {
        ctx.filter = `blur(${cropBlur}px)`;
      }

      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      const dx = (cropPosX / 100) * targetWidth;
      const dy = (cropPosY / 100) * targetHeight;
      ctx.translate(dx, dy);

      const imgRatio = img.width / img.height;
      const targetRatio = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;

      if (imgRatio > targetRatio) {
        drawW = targetHeight * imgRatio;
      } else {
        drawH = targetWidth / imgRatio;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'cropped-wallpaper.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('themeImage', croppedFile);
        formData.append('themeColor', activeConversation.themeColor || '');

        try {
          const res = await api.patch(`/chats/${activeConversation._id}/theme`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          dispatch(updateConversation(res.data.conversation));
          setShowCropModal(false);
          setCropImageSrc(null);
          alert('Theme wallpaper cropped and updated!');
        } catch (err) {
          console.error(err);
          alert('Failed to save theme wallpaper.');
        }
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => {
      alert('Failed to process image. Make sure it is a valid image format.');
    };
  };

  const handleClearTheme = async () => {
    if (!activeConversation) return;
    try {
      const res = await api.delete(`/chats/${activeConversation._id}/theme`);
      dispatch(updateConversation(res.data.conversation));
      alert('Theme cleared.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear theme.');
    }
  };

  const handleUpdateGroupDetails = async () => {
    if (!activeConversation || activeConversation.type !== 'group' || !activeConversation.groupId) return;
    try {
      const formData = new FormData();
      formData.append('name', editGroupName);
      formData.append('description', editGroupDescription);
      if (selectedGroupAvatarFile) {
        formData.append('avatar', selectedGroupAvatarFile);
      }
      const res = await api.patch(`/groups/${activeConversation.groupId._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedConv = {
        ...activeConversation,
        groupId: res.data.group,
      };
      dispatch(updateConversation(updatedConv));
      setShowEditGroupModal(false);
      setSelectedGroupAvatarFile(null);
      alert('Group details updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update group details.');
    }
  };

  // Folder packing & unpacking Web Tar format
  const packFolderToTar = async (files: FileList): Promise<Blob> => {
    const encoder = new TextEncoder();
    const buffers: ArrayBuffer[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      
      const pathHeader = new Uint8Array(256);
      const encodedPath = encoder.encode(path);
      pathHeader.set(encodedPath.subarray(0, 256));
      
      const sizeHeader = new Uint8Array(16);
      const encodedSize = encoder.encode(file.size.toString());
      sizeHeader.set(encodedSize.subarray(0, 16));

      buffers.push(pathHeader.buffer);
      buffers.push(sizeHeader.buffer);

      const data = await file.arrayBuffer();
      buffers.push(data);
    }

    return new Blob(buffers, { type: 'application/octet-stream' });
  };

  const handleFolderUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const firstPath = files[0].webkitRelativePath || '';
    const folderName = firstPath.split('/')[0] || 'Uploaded Folder';

    alert(`Packing ${files.length} files from folder "${folderName}"...`);
    try {
      const archiveBlob = await packFolderToTar(files);
      const packedFile = new File([archiveBlob], `${folderName}.vchats.tar`, { type: 'application/octet-stream' });
      setSelectedMessageFile(packedFile);
    } catch (err) {
      console.error(err);
      alert('Failed to pack folder files.');
    }
  };

  const unpackTarFolder = async (fileUrl: string, archiveName: string) => {
    try {
      const response = await fetch(fileUrl);
      const buffer = await response.arrayBuffer();
      const decoder = new TextDecoder();
      
      let offset = 0;
      const filesExtracted: { name: string; blob: Blob }[] = [];
      
      while (offset < buffer.byteLength) {
        if (offset + 256 + 16 > buffer.byteLength) break;
        
        const pathBytes = new Uint8Array(buffer, offset, 256);
        let pathLength = pathBytes.indexOf(0);
        if (pathLength === -1) pathLength = 256;
        const path = decoder.decode(pathBytes.subarray(0, pathLength));
        offset += 256;
        
        const sizeBytes = new Uint8Array(buffer, offset, 16);
        let sizeLength = sizeBytes.indexOf(0);
        if (sizeLength === -1) sizeLength = 16;
        const sizeStr = decoder.decode(sizeBytes.subarray(0, sizeLength));
        const size = parseInt(sizeStr);
        offset += 16;
        
        if (offset + size > buffer.byteLength) break;
        
        const fileContent = new Uint8Array(buffer, offset, size);
        offset += size;
        
        const fileBlob = new Blob([fileContent], { type: 'application/octet-stream' });
        filesExtracted.push({ name: path, blob: fileBlob });
      }
      
      if (filesExtracted.length === 0) {
        alert('Empty or invalid folder archive.');
        return;
      }
      
      filesExtracted.forEach((f) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(f.blob);
        link.download = f.name;
        link.click();
      });
      alert(`Successfully unpacked and downloaded ${filesExtracted.length} files from ${archiveName}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to unpack folder archive.');
    }
  };

  // Live Audio/Video Recording handlers
  const startRecording = async (type: 'audio' | 'video') => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video' ? { width: 400, height: 300 } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      recordingStreamRef.current = stream;
      
      const chunks: Blob[] = [];
      
      // Determine device compatible mimeType (specifically for iOS Safari support)
      let mimeType = '';
      if (type === 'video') {
        if (typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
          } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
          }
        }
      } else {
        if (typeof MediaRecorder.isTypeSupported === 'function') {
          if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            mimeType = 'audio/aac';
          }
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || (type === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunks, { type: actualMimeType });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };
      
      setRecordingType(type);
      setIsRecording(true);
      setRecordingSeconds(0);
      setRecordedBlob(null);
      setRecordedUrl(null);
      
      mediaRecorder.start();
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('Failed to access media devices for recording.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingType(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingCaption('');
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    if (recordingStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const handleSendRecordedMessage = async () => {
    if (!recordedBlob || !activeConversation) return;
    
    // Dynamically resolve correct file extension based on recording MIME Type
    let fileExtension = 'webm';
    if (recordedBlob.type) {
      const parts = recordedBlob.type.split('/');
      if (parts.length > 1) {
        const ext = parts[1].split(';')[0];
        if (ext === 'x-matroska') {
          fileExtension = 'mkv';
        } else if (ext === 'quicktime') {
          fileExtension = 'mov';
        } else if (ext === 'mp4' || ext === 'm4a') {
          fileExtension = 'mp4';
        } else if (ext) {
          fileExtension = ext;
        }
      }
    }
    
    const fileName = `recorded-${Date.now()}.${fileExtension}`;
    const fileType = recordingType === 'video' ? 'video' : 'audio';
    const file = new File([recordedBlob], fileName, { type: recordedBlob.type });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('content', recordingCaption || (recordingType === 'video' ? '🎥 Video message' : '🎤 Voice message'));
    formData.append('conversationId', activeConversation._id);
    formData.append('type', fileType);

    try {
      await api.post('/messages/send', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      cancelRecording();
    } catch (err) {
      console.error(err);
      alert('Failed to send recorded message.');
    }
  };

  const renderThemeSelection = () => {
    if (!activeConversation) return null;
    return (
      <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-900/50 space-y-4">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
          Chat Theme & Wallpaper
        </span>
        
        {/* Preset Colors */}
        <div className="space-y-2">
          <span className="text-[9px] text-gray-400 block">Theme Color</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { name: 'Default', hex: '' },
              { name: 'Teal', hex: '#0d4f47' },
              { name: 'Indigo', hex: '#222047' },
              { name: 'Violet', hex: '#3b1c47' },
              { name: 'Crimson', hex: '#4f1c34' },
              { name: 'Emerald', hex: '#1c4f2e' },
              { name: 'Midnight', hex: '#0c2242' },
              { name: 'Amber', hex: '#4f411c' },
            ].map((theme) => (
              <button
                key={theme.name}
                type="button"
                onClick={() => handleUpdateTheme(theme.hex)}
                className={`w-6 h-6 rounded-full border text-[8px] font-bold flex items-center justify-center ${
                  activeConversation.themeColor === theme.hex
                    ? 'border-white scale-110 shadow-md'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: theme.hex || '#1a1a1a' }}
                title={theme.name}
              >
                {theme.name === 'Default' && 'None'}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Wallpapers */}
        <div className="space-y-2">
          <span className="text-[9px] text-gray-400 block">Wallpaper Preset</span>
          <div className="flex gap-2">
            {[
              { name: 'Abstract', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400' },
              { name: 'Neon', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400' },
              { name: 'Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400' },
            ].map((wp) => (
              <button
                key={wp.name}
                type="button"
                onClick={() => {
                  setCropImageSrc(wp.url);
                  setCropZoom(1.0);
                  setCropPosX(0);
                  setCropPosY(0);
                  setCropBlur(0);
                  setCropRotation(0);
                  setShowCropModal(true);
                }}
                className={`flex-1 h-8 rounded-lg overflow-hidden border relative ${
                  activeConversation.themeImage === wp.url ? 'border-brandTeal border-2' : 'border-transparent'
                }`}
                title={wp.name}
              >
                <img src={wp.url} className="w-full h-full object-cover opacity-80" alt="" />
              </button>
            ))}
          </div>
        </div>

        {/* Custom wallpaper uploader */}
        <div className="space-y-2">
          <span className="text-[9px] text-gray-400 block">Upload Wallpaper</span>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadThemeImage}
              className="hidden"
              id="theme-wallpaper-uploader"
            />
            <label
              htmlFor="theme-wallpaper-uploader"
              className="flex-1 py-1.5 rounded-lg bg-gray-955 hover:bg-gray-900 text-center text-[10px] font-bold text-white border border-gray-850 cursor-pointer"
            >
              Choose Photo
            </label>
            {(activeConversation.themeColor || activeConversation.themeImage) && (
              <button
                type="button"
                onClick={handleClearTheme}
                className="px-2 py-1.5 rounded-lg bg-red-955 text-red-400 text-[10px] font-bold"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Friends & Contacts Handlers
  const loadFriendsData = async () => {
    try {
      const reqsRes = await api.get('/friends/requests');
      setFriendRequests(reqsRes.data.requests);
      const listRes = await api.get('/friends/list');
      setFriends(listRes.data.friends);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriendsData();
    }
  }, [activeTab]);

  const handleFriendResponse = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      await api.post('/friends/respond', { requestId, action });
      loadFriendsData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendRequest = async (usernameOrEmail: string) => {
    if (!usernameOrEmail.trim()) return;
    try {
      await api.post('/friends/request', { identifier: usernameOrEmail });
      alert('Friend request sent!');
      setFriendSearchQuery('');
      loadFriendsData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error sending request.');
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      await api.delete(`/friends/${friendId}`);
      loadFriendsData();
    } catch (err) {
      console.error(err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Backend logout failed:', err);
    } finally {
      dispatch(logoutSuccess());
      dispatch(clearChatState());
      navigate('/login');
    }
  };

  const innerContent = (
    <div className="flex flex-col w-full h-screen h-[100dvh] overflow-hidden bg-obsidian text-gray-200 font-sans selection:bg-brandTeal selection:text-white">
      {/* Top PWA Native App Install Banner */}
      {isInstallable && (
        <div className="w-full bg-gradient-to-r from-brandTeal via-teal-600 to-brandViolet text-white px-4 py-2 flex items-center justify-between z-50 text-xs font-semibold shadow-md shrink-0 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">📱</span>
            <span className="truncate">Install <b>VChats Native App</b> for Standalone App Mode (No Chrome Bar)!</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={handleInstallApp}
              className="bg-white text-gray-950 hover:bg-gray-100 px-3 py-1 rounded-lg text-xs font-extrabold shadow transition-all hover:scale-105"
            >
              Install Native App
            </button>
            <button
              onClick={() => setIsInstallable(false)}
              className="text-white/80 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-1 w-full overflow-hidden ${
        isMobileView ? 'flex-col' : 'flex-row'
      }`}>
      {/* 1. Nav Sidebar (Bottom on mobile, Left on desktop) */}
      <div className={`z-30 ${
        isMobileView
          ? `fixed bottom-0 left-0 w-full h-16 flex flex-row items-center justify-around py-0 px-4 border-t border-gray-900 bg-gray-950/90 ${
              showMobileChatActive && activeConversation ? 'hidden' : 'flex'
            }`
          : 'relative bottom-auto left-auto w-16 h-screen flex flex-col justify-between py-6 px-0 border-r border-gray-900 bg-gray-950/60 flex'
      }`}>
        <div className={`flex items-center gap-6 ${isMobileView ? 'flex-row' : 'flex-col'}`}>
          {!isMobileView && (
            <div className="w-10 h-10 rounded-xl bg-teal-gradient items-center justify-center font-bold text-lg text-white shadow-glass flex">
              V
            </div>
          )}

          <div className={`flex gap-3 ${isMobileView ? 'flex-row' : 'flex-col'}`}>
            <button
              onClick={() => setActiveTab('chats')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'chats'
                  ? 'bg-brandTeal text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900/60'
              }`}
              title={getTranslation('chats')}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'friends'
                  ? 'bg-brandTeal text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900/60'
              }`}
              title="Contacts & Friends"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'status'
                  ? 'bg-brandTeal text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900/60'
              }`}
              title="Status Feed"
            >
              <Activity className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('calls')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'calls'
                  ? 'bg-brandTeal text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900/60'
              }`}
              title="Call History"
            >
              <Phone className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-3 rounded-xl transition-all ${
                activeTab === 'settings'
                  ? 'bg-brandTeal text-white shadow-lg'
                  : 'text-gray-500 hover:text-white hover:bg-gray-900/60'
              }`}
              title={getTranslation('settings')}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-4 ${isMobileView ? 'flex-row' : 'flex-col'}`}>
          {user?.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="p-3 rounded-xl text-brandViolet hover:bg-gray-900/60 transition-colors"
              title="Admin Panel"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-3 rounded-xl text-red-500 hover:bg-red-950/20 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Sidebar Pane (Tab-specific list pane) */}
      <div className={`border-r border-gray-900 bg-gray-950/30 flex flex-col z-20 ${
        isMobileView
          ? `w-full pb-16 ${showMobileChatActive && activeConversation ? 'hidden' : 'flex'}`
          : 'w-80 pb-0 flex'
      }`}>
        {/* Chats Tab View */}
        {activeTab === 'chats' && (() => {
          const filteredConversations = conversations.filter((conv) => {
            const title = getConversationTitle(conv, currentUserId).toLowerCase();
            const queryMatch = title.includes(searchQuery.toLowerCase());
            if (!queryMatch) return false;

            const isLocked = conv.lockedBy?.includes(currentUserId);
            if (isLocked && !isLockedChatsUnlocked) {
              return false;
            }

            if (chatsFilter === 'groups') {
              return conv.type === 'group';
            }
            if (chatsFilter === 'favorites') {
              return conv.favorites?.includes(currentUserId);
            }
            if (chatsFilter !== 'all') {
              const listConvs = customLists[chatsFilter] || [];
              return listConvs.includes(conv._id);
            }
            return true;
          });

          return (
            <>
              <div className="p-4 flex items-center justify-between border-b border-gray-900/60">
                <span className="font-extrabold text-xl tracking-tight text-white">{getTranslation('chats')}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-brandTeal"
                    title="New Direct Chat"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowNewGroupModal(true)}
                    className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-brandViolet"
                    title="New Group Chat"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conversation search */}
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder={getTranslation('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Filter pills */}
              <div className="px-3 pb-2 flex gap-1.5 text-[10px] font-bold overflow-x-auto custom-scrollbar scrollbar-none scroll-smooth">
                <button
                  type="button"
                  onClick={() => setChatsFilter('all')}
                  className={`px-3 py-1 rounded-full transition-all shrink-0 ${
                    chatsFilter === 'all'
                      ? 'bg-brandTeal text-white'
                      : 'bg-gray-900 hover:bg-gray-850 text-gray-400'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setChatsFilter('groups')}
                  className={`px-3 py-1 rounded-full transition-all shrink-0 ${
                    chatsFilter === 'groups'
                      ? 'bg-brandTeal text-white'
                      : 'bg-gray-900 hover:bg-gray-850 text-gray-400'
                  }`}
                >
                  Groups
                </button>
                <button
                  type="button"
                  onClick={() => setChatsFilter('favorites')}
                  className={`px-3 py-1 rounded-full transition-all shrink-0 ${
                    chatsFilter === 'favorites'
                      ? 'bg-brandTeal text-white'
                      : 'bg-gray-900 hover:bg-gray-850 text-gray-400'
                  }`}
                >
                  Favorites
                </button>
                {Object.keys(customLists).map((listName) => (
                  <button
                    key={listName}
                    type="button"
                    onClick={() => setChatsFilter(listName)}
                    className={`px-3 py-1 rounded-full transition-all shrink-0 ${
                      chatsFilter === listName
                        ? 'bg-brandTeal text-white'
                        : 'bg-gray-900 hover:bg-gray-850 text-gray-400'
                    }`}
                  >
                    {listName}
                  </button>
                ))}
              </div>

              {/* Chats list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {/* Locked Chats row */}
                {conversations.some((c) => c.lockedBy?.includes(currentUserId)) && (
                  <div
                    onClick={() => handleLockedChatsClick()}
                    className="p-3 mx-2 my-1 rounded-xl bg-gray-900/40 border border-gray-800 hover:bg-gray-900/60 flex items-center justify-between cursor-pointer transition-all select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm">🔒</span>
                      <div className="text-left">
                        <span className="font-bold text-xs text-white block">Locked Chats</span>
                        <span className="text-[10px] text-gray-500">
                          {isLockedChatsUnlocked ? 'Unlocked & visible' : 'Tap to unlock private chats'}
                        </span>
                      </div>
                    </div>
                    {isLockedChatsUnlocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLockedChatsUnlocked(false);
                        }}
                        className="text-[9px] font-bold text-brandTeal hover:underline"
                      >
                        Lock again
                      </button>
                    )}
                  </div>
                )}

                {/* AI Assistant Special Room */}
                <div
                  onClick={() => {
                    dispatch(setActiveConversation({
                      _id: 'ai-assistant',
                      type: 'ai',
                      participants: [],
                      unreadCounts: {}
                    } as any));
                    setShowMobileChatActive(true);
                  }}
                  className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                    activeConversation?._id === 'ai-assistant'
                      ? 'bg-brandTeal/10 border border-brandTeal/30'
                      : 'hover:bg-gray-900 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-teal-gradient flex items-center justify-center text-white font-bold">
                      🤖
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-white truncate">VChats AI Assistant</span>
                      <span className="text-[10px] text-brandTeal font-bold">AI Helper</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      Ask me to translate, summarize, write code...
                    </p>
                  </div>
                </div>

                {filteredConversations.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-12">No active chats found.</div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isGroup = conv.type === 'group';
                    const title = getConversationTitle(conv, currentUserId);
                    const avatar = getConversationAvatar(conv, currentUserId);
                    const targetUser = !isGroup ? conv.participants.find((p) => {
                      const pId = typeof p === 'object' ? p._id || (p as any).id : p;
                      return pId && currentUserId && pId.toString() !== currentUserId.toString();
                    }) : null;
                    const isOnline = targetUser && typeof targetUser === 'object' && onlineUsers.includes(targetUser._id?.toString() || (targetUser as any).id?.toString());

                    return (
                      <div
                        key={conv._id}
                        onClick={() => {
                          dispatch(setActiveConversation(conv));
                          setShowMobileChatActive(true);
                        }}
                        className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                          activeConversation?._id === conv._id
                            ? 'bg-brandTeal/10 border border-brandTeal/30'
                            : 'hover:bg-gray-900 border border-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <img
                            src={getFileUrl(avatar, title)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(title); }}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover"
                          />
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-brandTeal rounded-full border-2 border-obsidian" />
                          )}
                        </div>

                        {/* Content details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-white truncate ${isMobileView ? 'text-base' : 'text-sm'}`}>{title}</span>
                            {conv.lastMessage && conv.lastMessage.createdAt && !isNaN(new Date(conv.lastMessage.createdAt).getTime()) && (
                              <span className={`${isMobileView ? 'text-xs' : 'text-[10px]'} ${conv.unreadCounts?.[currentUserId] > 0 ? 'text-brandTeal font-bold' : 'text-gray-505'}`}>
                                {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            {(() => {
                              const convTyping = typingStatus?.[conv._id];
                              const typingUsers = convTyping ? Object.keys(convTyping).filter(uid => uid !== currentUserId) : [];
                              if (typingUsers.length > 0) {
                                return (
                                  <p className={`text-brandTeal font-bold truncate flex-1 pr-2 animate-pulse ${isMobileView ? 'text-sm' : 'text-xs'}`}>
                                    typing...
                                  </p>
                                );
                              }
                              return (
                                <p className={`text-gray-400 truncate flex-1 pr-2 ${isMobileView ? 'text-sm' : 'text-xs'}`}>
                                  {conv.lastMessage && typeof conv.lastMessage === 'object' ? conv.lastMessage.content : 'No messages yet'}
                                </p>
                              );
                            })()}
                            {conv.unreadCounts?.[currentUserId] > 0 && (
                              <span className="w-5 h-5 rounded-full bg-brandTeal flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-md animate-pulse">
                                {conv.unreadCounts[currentUserId]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          );
        })()}

        {/* Friends Tab View */}
        {activeTab === 'friends' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-900/60">
              <span className="font-extrabold text-xl text-white">Friends & Contacts</span>
            </div>

            {/* Friend request sender search */}
            <div className="p-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2 px-1">
                Add Friend by Username or Email
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Username or email..."
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white"
                />
                <button
                  onClick={() => sendRequest(friendSearchQuery)}
                  className="px-3 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold text-xs"
                >
                  Send
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {/* 1. Pending Requests */}
              {friendRequests.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-brandViolet uppercase tracking-wider block mb-2 px-1">
                    Pending Requests ({friendRequests.length})
                  </span>
                  <div className="space-y-2">
                    {friendRequests.map((req) => (
                      <div key={req._id} className="p-3 rounded-xl bg-gray-900/40 border border-gray-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getFileUrl(req.sender.profilePhoto, req.sender.displayName || req.sender.username)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(req.sender.displayName || req.sender.username); }}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">{req.sender.displayName}</span>
                            <span className="text-[9px] text-gray-500 block truncate">@{req.sender.username}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleFriendResponse(req._id, 'accepted')}
                            className="p-1 px-2 rounded-lg bg-brandTeal text-white text-[10px] font-bold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleFriendResponse(req._id, 'rejected')}
                            className="p-1 px-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-[10px] font-bold"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Friends List */}
              <div>
                <span className="text-[10px] font-bold text-brandTeal uppercase tracking-wider block mb-2 px-1">
                  My Contacts ({friends.length})
                </span>
                {friends.length === 0 ? (
                  <div className="text-center text-xs text-gray-500 py-6">No friends added yet.</div>
                ) : (
                  <div className="space-y-1">
                    {friends.map((friend) => (
                      <div key={friend._id} className="p-2.5 hover:bg-gray-900 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getFileUrl(friend.profilePhoto, friend.displayName || friend.username)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(friend.displayName || friend.username); }}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-white block truncate">{friend.displayName}</span>
                            <span className="text-[9px] text-gray-500 block truncate">@{friend.username}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.post('/chats/direct', { targetUserId: friend._id });
                                dispatch(updateConversation(res.data.conversation));
                                dispatch(setActiveConversation(res.data.conversation));
                                setActiveTab('chats');
                                setShowMobileChatActive(true);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="p-1.5 px-2.5 rounded-lg bg-brandTeal/10 hover:bg-brandTeal text-brandTeal hover:text-white text-[10px] font-bold transition-all"
                          >
                            Chat
                          </button>
                          <button
                            onClick={() => removeFriend(friend._id)}
                            className="p-1.5 rounded-lg bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-950/20 text-[10px] font-bold transition-all"
                            title="Remove Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Tab View */}
        {activeTab === 'status' && (
          <div className="flex flex-col h-full">
            <div className="p-4 flex items-center justify-between border-b border-gray-900/60">
              <span className="font-extrabold text-xl text-white">Status</span>
              <button
                onClick={() => {
                  setStoryUploadMediaType('text');
                  setShowStoryUploadModal(true);
                }}
                className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-brandTeal"
                title="Create Status"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Updates
                </span>
                <div className="space-y-2 mt-2">
                  {storyFeed.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm mt-6">No status updates yet.</div>
                  ) : (
                    storyFeed.map((item) => (
                      <div
                        key={item.user._id}
                        onClick={() => {
                          setActiveStoryGroup(item);
                          setActiveStoryIndex(0);
                        }}
                        className="flex items-center gap-3 p-2 hover:bg-gray-900 rounded-xl cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-brandTeal p-0.5">
                          <img
                            src={getFileUrl(item.user.profilePhoto, item.user.displayName || item.user.username)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(item.user.displayName || item.user.username); }}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-white block">{item.user.displayName}</span>
                          <span className="text-[10px] text-gray-500">
                            {item.stories.length} status update{item.stories.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calls Tab View */}
        {activeTab === 'calls' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-900/60 flex items-center justify-between">
              <span className="font-extrabold text-xl text-white">Calls</span>
              {callLogs.length > 0 && (
                <button
                  onClick={handleClearCallLogs}
                  className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {callLogs.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-12">No recent voice or video calls.</div>
              ) : (
                callLogs.map((log) => {
                  const isOutgoing = log.callerId?._id === currentUserId;
                  const isGroup = log.conversationId?.type === 'group';
                  
                  let displayName = 'Unknown User';
                  let profilePhoto = '';
                  let isVideo = log.type === 'video';
                  
                  if (isGroup) {
                    displayName = log.conversationId?.groupId?.name || 'Group Call';
                    profilePhoto = log.conversationId?.groupId?.avatar || '';
                  } else {
                    const peer = isOutgoing ? log.receiverId : log.callerId;
                    displayName = peer?.displayName || peer?.username || 'VChats User';
                    profilePhoto = peer?.profilePhoto || '';
                  }

                  const formattedTime = new Date(log.startedAt || log.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={log._id}
                      className="p-3 rounded-xl flex items-center justify-between hover:bg-gray-900/40 border border-transparent hover:border-gray-900 group transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {profilePhoto ? (
                          <img 
                            src={getFileUrl(profilePhoto, displayName)} 
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(displayName); }} 
                            alt="" 
                            className="w-10 h-10 rounded-xl object-cover shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 font-bold shrink-0">
                            {isGroup ? 'G' : 'C'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="font-bold text-sm text-white block truncate">{displayName}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isOutgoing ? (
                              <span className="text-[10px] text-green-500 font-extrabold">↗ Outgoing</span>
                            ) : log.status === 'missed' || log.status === 'rejected' ? (
                              <span className="text-[10px] text-red-500 font-extrabold">↙ Missed</span>
                            ) : (
                              <span className="text-[10px] text-blue-500 font-extrabold">↙ Incoming</span>
                            )}
                            <span className="text-[10px] text-gray-500">•</span>
                            <span className="text-[10px] text-gray-500">{formattedTime}</span>
                            {log.duration > 0 && (
                              <>
                                <span className="text-[10px] text-gray-500">•</span>
                                <span className="text-[10px] text-gray-500">
                                  {Math.floor(log.duration / 60)}m {log.duration % 60}s
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            if (isGroup) {
                              const conv = conversations.find(c => c._id === log.conversationId?._id);
                              if (conv) {
                                dispatch(setActiveConversation(conv));
                              }
                            } else {
                              const peer = isOutgoing ? log.receiverId : log.callerId;
                              if (peer) {
                                try {
                                  const res = await api.post('/chats/direct', { targetUserId: peer._id });
                                  dispatch(setActiveConversation(res.data.conversation));
                                  setTimeout(() => {
                                    triggerCall(isVideo ? 'video' : 'voice');
                                  }, 500);
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                            }
                          }}
                          className="p-2 rounded-lg bg-gray-900/60 hover:bg-gray-800 text-brandTeal"
                          title="Call again"
                        >
                          {isVideo ? (
                            <Video className="w-3.5 h-3.5" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteCallLog(log._id)}
                          className="p-2 rounded-lg hover:bg-red-950/40 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete call log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

              {activeTab === 'settings' && (
          <div className="flex flex-col h-full bg-gray-950/20 text-white">
            {activeSettingSubPage === 'main' ? (
              // Main Settings Page
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-900/60 flex items-center justify-between">
                  <span className="font-extrabold text-xl text-white">{getTranslation('settings')}</span>
                </div>
                
                {/* Search Settings input */}
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search settings..."
                      value={settingsSearchQuery}
                      onChange={(e) => setSettingsSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                  {/* Profile Quick link card */}
                  {settingsSearchQuery === '' && (
                    <div 
                      onClick={() => setActiveSettingSubPage('profile')}
                      className="flex items-center gap-3 bg-gray-900/40 p-3.5 rounded-2xl border border-gray-900/50 hover:bg-gray-900 cursor-pointer transition-all"
                    >
                      <img
                        src={getFileUrl(user?.profilePhoto, user?.displayName || user?.username)}
                        onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(user?.displayName || user?.username || 'User'); }}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-extrabold text-sm text-white block truncate">{user?.displayName}</span>
                        <span className="text-[10px] text-gray-550 block truncate">@{user?.username}</span>
                      </div>
                    </div>
                  )}

                  {/* Settings Options List */}
                  <div className="space-y-1">
                    {[
                      { id: 'language', title: 'Language & Region', desc: 'Select preferred app & AI assistant language', icon: Globe },
                      { id: 'general', title: 'General', desc: 'Startup and close', icon: Sliders },
                      { id: 'profile', title: 'Profile', desc: 'Name, profile picture, username', icon: UserIcon },
                      { id: 'account', title: 'Account', desc: 'Security notifications, account info', icon: Shield },
                      { id: 'privacy', title: 'Privacy', desc: 'Blocked contacts, disappearing messages', icon: Clock },
                      { id: 'chats', title: 'Chats', desc: 'Theme, wallpaper, chat settings', icon: Image },
                      { id: 'video-voice', title: 'Video & voice', desc: 'Camera, microphone & speakers', icon: Video },
                      { id: 'notifications', title: 'Notifications', desc: 'Messages, groups, sounds', icon: Volume2 },
                      { id: 'shortcuts', title: 'Keyboard shortcuts', desc: 'Quick actions', icon: Music },
                      { id: 'download', title: 'Download VChats App', desc: 'Install VChats for PC, Android & iOS', icon: Download },
                      { id: 'help', title: 'Help and feedback', desc: 'Help centre, contact us, privacy policy', icon: Info },
                    ]
                      .filter(opt => 
                        opt.title.toLowerCase().includes(settingsSearchQuery.toLowerCase()) || 
                        opt.desc.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                      )
                      .map((opt) => {
                        const IconComponent = opt.icon;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              if (opt.id === 'download') {
                                setShowDownloadModal(true);
                              } else {
                                setActiveSettingSubPage(opt.id as any);
                              }
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gray-900/60 rounded-xl cursor-pointer transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-400">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`font-bold text-gray-200 block ${isMobileView ? 'text-sm' : 'text-xs'}`}>{opt.title}</span>
                              <span className={`text-gray-555 block ${isMobileView ? 'text-xs' : 'text-[10px]'}`}>{opt.desc}</span>
                            </div>
                          </div>
                        );
                      })}

                    {/* Log out option */}
                    {(settingsSearchQuery === '' || 'log out'.includes(settingsSearchQuery.toLowerCase())) && (
                      <div
                        onClick={handleLogout}
                        className="flex items-center gap-3 p-3 hover:bg-red-950/20 rounded-xl cursor-pointer transition-all border-t border-gray-900/60 mt-2"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-950/30 flex items-center justify-center text-red-500">
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-red-500 block">Log out</span>
                          <span className="text-[10px] text-red-750 block">Log out of this device</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Detailed Settings Sub-page
              <div className="flex flex-col h-full">
                {/* Sub-page Header */}
                <div className="p-4 border-b border-gray-900/60 flex items-center gap-3">
                  <button 
                    onClick={() => setActiveSettingSubPage('main')}
                    className="p-1 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="font-extrabold text-sm text-white capitalize">
                    {activeSettingSubPage.replace('-', ' & ')}
                  </span>
                </div>

                {/* Sub-page Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5 text-xs text-gray-300">
                  
                  {/* PROFILE SUB-PAGE */}
                  {activeSettingSubPage === 'profile' && (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center gap-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <div className="w-20 h-20 rounded-2xl bg-teal-gradient p-0.5 relative group">
                          <img
                            src={getFileUrl(user?.profilePhoto, user?.displayName || user?.username)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(user?.displayName || user?.username || 'User'); }}
                            alt=""
                            className="w-full h-full rounded-2xl object-cover"
                          />
                          <label
                            htmlFor="profile-photo-input-sub"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center cursor-pointer transition-opacity"
                            title="Change Profile Photo"
                          >
                            <Edit3 className="w-5 h-5 text-white" />
                          </label>
                          <input
                            type="file"
                            id="profile-photo-input-sub"
                            accept="image/*"
                            onChange={handleProfilePhotoUpload}
                            className="hidden"
                          />
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-white block">{user?.displayName}</span>
                          <span className="text-[10px] text-gray-500">@{user?.username}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Display Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Status Message</label>
                          <input
                            type="text"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Bio Description</label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white resize-none"
                          />
                        </div>
                        <button
                          onClick={handleUpdateProfileSettings}
                          className="w-full py-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold transition-all text-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                  {/* LANGUAGE & REGION SUB-PAGE */}
                  {activeSettingSubPage === 'language' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs block mb-2 uppercase tracking-wide text-gray-550">Language & AI Preference</h4>
                      <div className="space-y-2.5 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <span className="text-xs text-gray-400 block mb-3 leading-relaxed">
                          Select your preferred language. The AI Assistant and app features will automatically communicate in your chosen language.
                        </span>
                        {[
                          { code: 'en', label: 'English', flag: '🇺🇸' },
                          { code: 'es', label: 'Español (Spanish)', flag: '🇪🇸' },
                          { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
                          { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
                          { code: 'fr', label: 'Français (French)', flag: '🇫🇷' },
                          { code: 'de', label: 'Deutsch (German)', flag: '🇩🇪' },
                          { code: 'ar', label: 'العربية (Arabic)', flag: '🇸🇦' },
                          { code: 'pt', label: 'Português (Portuguese)', flag: '🇧🇷' },
                          { code: 'zh', label: '中文 (Chinese)', flag: '🇨🇳' },
                          { code: 'ja', label: '日本語 (Japanese)', flag: '🇯🇵' },
                          { code: 'ru', label: 'Русский (Russian)', flag: '🇷🇺' },
                        ].map((lang) => (
                          <label key={lang.code} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-900 cursor-pointer transition-colors border border-gray-900/40">
                            <div className="flex items-center gap-3">
                              <span className="text-base">{lang.flag}</span>
                              <span className="font-bold text-xs text-gray-200">{lang.label}</span>
                            </div>
                            <input
                              type="radio"
                              name="appLanguagePreference"
                              checked={(localStorage.getItem('vchats_language') || 'en') === lang.code}
                              onChange={() => {
                                localStorage.setItem('vchats_language', lang.code);
                                window.location.reload();
                              }}
                              className="w-4 h-4 text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GENERAL SUB-PAGE */}
                  {activeSettingSubPage === 'general' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs block mb-2 uppercase tracking-wide text-gray-550">App Startup Options</h4>
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_startup') === 'true'}
                            onChange={(e) => localStorage.setItem('vchats_startup', e.target.checked.toString())}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                          />
                          <div>
                            <span className="font-bold text-gray-200 block">Launch at startup</span>
                            <span className="text-[10px] text-gray-550 block">Start VChats when you log into your computer.</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer border-t border-gray-900 pt-3">
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_close_tray') === 'true'}
                            onChange={(e) => localStorage.setItem('vchats_close_tray', e.target.checked.toString())}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                          />
                          <div>
                            <span className="font-bold text-gray-200 block">Close to system tray</span>
                            <span className="text-[10px] text-gray-550 block">Minimize application to the system tray instead of exiting.</span>
                          </div>
                        </label>
                      </div>

                      {/* Layout Mode Options */}
                      <h4 className="font-bold text-white text-xs block mb-2 uppercase tracking-wide text-gray-550 mt-4">App Layout Mode</h4>
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        {[
                          { id: 'responsive', name: 'Auto / Responsive', desc: 'Adapts automatically to window size' },
                          { id: 'desktop', name: 'Desktop Mode', desc: 'Forces dual-pane (sidebar + chat) split layout' },
                          { id: 'mobile', name: 'Mobile Mode', desc: 'Forces single-pane mobile layout (collapsible sidebar)' },
                          { id: 'mockup', name: 'Mobile Mockup', desc: 'Simulates a premium virtual smartphone device frame' }
                        ].map((mode) => (
                          <label key={mode.id} className="flex items-center gap-3 cursor-pointer first:pt-0 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-900/50 [&:not(:first-child)]:pt-3">
                            <input
                              type="radio"
                              name="layoutMode"
                              checked={layoutMode === mode.id}
                              onChange={() => {
                                setLayoutMode(mode.id as any);
                                localStorage.setItem('vchats_layout_mode', mode.id);
                              }}
                              className="w-4 h-4 text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal focus:outline-none"
                            />
                            <div>
                              <span className="font-bold text-gray-200 block text-xs">{mode.name}</span>
                              <span className="text-[10px] text-gray-500 block">{mode.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* PWA App Installation Option */}
                      <h4 className="font-bold text-white text-xs block mb-2 uppercase tracking-wide text-gray-550 mt-4">PWA Native Desktop & Mobile App</h4>
                      <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-900 space-y-3">
                        <span className="text-[10px] text-gray-550 block leading-relaxed">
                          Install VChats as a native application on your device for standalone window operation, startup launching, and instant loading.
                        </span>
                        
                        {isInstallable ? (
                          <button
                            type="button"
                            onClick={handleInstallApp}
                            className="w-full py-2 px-4 rounded-xl bg-teal-gradient text-white text-xs font-bold shadow-lg hover:shadow-teal-500/20 hover:scale-[1.01] active:scale-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" /> Install VChats Native App
                          </button>
                        ) : (
                          <div className="p-3 bg-gray-955/40 rounded-xl border border-gray-900 text-center">
                            <span className="text-[10px] text-gray-450 block font-medium">
                              {navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') ? (
                                'To install on iOS: Tap the "Share" button in Safari and select "Add to Home Screen".'
                              ) : (
                                'VChats is already installed or is running directly within your web browser.'
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => alert("General preferences updated successfully.")}
                        className="w-full py-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold transition-all text-xs"
                      >
                        Save Preferences
                      </button>
                    </div>
                  )}

                  {/* ACCOUNT SUB-PAGE */}
                  {activeSettingSubPage === 'account' && (
                    <div className="space-y-5">
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-2">Security Configurations</h4>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <span className="font-bold text-gray-255 block">Security Notifications</span>
                            <span className="text-[10px] text-gray-500 block">Get notified when a contact's keys change.</span>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_security_notif') === 'true'}
                            onChange={(e) => localStorage.setItem('vchats_security_notif', e.target.checked.toString())}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-xs block">Two-Factor Authentication (2FA)</span>
                          <span className="text-[10px] text-gray-550">Add an extra layer of login verification security.</span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const nextVal = !user?.twoFactorEnabled;
                              await api.patch('/users/profile', { twoFactorEnabled: nextVal });
                              dispatch(updateUser({ ...user, twoFactorEnabled: nextVal } as User));
                              alert(`Two-Factor Authentication has been ${nextVal ? 'enabled' : 'disabled'}.`);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            user?.twoFactorEnabled
                              ? 'bg-red-650/20 hover:bg-red-650 text-red-400 hover:text-white'
                              : 'bg-brandTeal/20 hover:bg-brandTeal text-brandTeal hover:text-white'
                          }`}
                        >
                          {user?.twoFactorEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>

                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-2">Account Management</h4>
                        <button
                          onClick={() => alert("Report requested. Your account info report will be prepared and sent to your email address within 3 days.")}
                          className="w-full text-left py-2 px-3 hover:bg-gray-850 rounded-xl text-gray-250 font-semibold transition-colors"
                        >
                          📩 Request Account Info Report
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to request account deletion? This action is irreversible. Your messages and data will be permanently wiped.")) {
                              alert("Deletion request sent. Please contact support@vchats.com to expedite this request.");
                            }
                          }}
                          className="w-full text-left py-2 px-3 hover:bg-red-950/20 rounded-xl text-red-400 font-semibold transition-colors mt-1"
                        >
                          ⚠️ Request Account Deletion
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PRIVACY SUB-PAGE */}
                  {activeSettingSubPage === 'privacy' && (
                    <div className="space-y-5">
                      {/* Blocked Contacts */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-1">Blocked Contacts</h4>
                        <span className="text-[10px] text-gray-500 block mb-2">Blocked contacts cannot call you or send you messages.</span>
                        <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                          {(!user?.blockedUsers || user.blockedUsers.length === 0) ? (
                            <div className="text-center text-[10px] text-gray-550 py-3">No blocked contacts.</div>
                          ) : (
                            user.blockedUsers.map((bUser: any) => {
                              const bId = typeof bUser === 'object' ? bUser._id : bUser;
                              const bName = typeof bUser === 'object' ? bUser.displayName : bUser;
                              return (
                                <div key={bId} className="flex items-center justify-between p-1.5 rounded-lg bg-gray-950/40 border border-gray-850">
                                  <span className="text-[11px] font-bold text-gray-300 truncate pr-2">
                                    {bName}
                                  </span>
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await api.post('/users/unblock', { targetUserId: bId });
                                        if (res.data.status === 'success') {
                                          const updatedBlocked = (user.blockedUsers || []).filter((id: any) => {
                                            const cmpId = typeof id === 'object' ? id._id : id;
                                            return cmpId !== bId;
                                          });
                                          dispatch(updateUser({ ...user, blockedUsers: updatedBlocked } as any));
                                          alert("User unblocked.");
                                        }
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-gray-850 hover:bg-gray-800 text-[9px] font-bold text-brandTeal rounded"
                                  >
                                    Unblock
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Default disappearing messages */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-1">Default Message Timer</h4>
                        <span className="text-[10px] text-gray-550 block mb-3">Start new chats with disappearing messages set to this duration.</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          {[
                            { label: 'Off', val: 0 },
                            { label: '24 Hours', val: 86400 },
                            { label: '7 Days', val: 604800 },
                            { label: '90 Days', val: 7776000 }
                          ].map((t) => {
                            const isDefault = parseInt(localStorage.getItem('vchats_default_disappearing') || '0', 10) === t.val;
                            return (
                              <button
                                key={t.val}
                                onClick={() => {
                                  localStorage.setItem('vchats_default_disappearing', t.val.toString());
                                  // Refresh component
                                  setActiveSettingSubPage('main');
                                  setTimeout(() => setActiveSettingSubPage('privacy'), 1);
                                }}
                                className={`py-1.5 px-3 rounded-lg border text-center transition-all ${
                                  isDefault
                                    ? 'bg-brandTeal/15 border-brandTeal text-brandTeal font-bold shadow-md'
                                    : 'bg-gray-950/40 border-gray-850 text-gray-405 hover:text-white'
                                }`}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Profile Chat Lock */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-xs block">Screen Profile Chat Lock</span>
                          <span className="text-[10px] text-gray-550">Configure PIN code to access locked conversations.</span>
                        </div>
                        <button
                          onClick={() => {
                            setPinModalMode(user?.chatLockPin ? 'verify' : 'setup');
                            setTargetLockConv(null);
                            setShowPinModal(true);
                          }}
                          className="px-3 py-1.5 bg-brandTeal/20 hover:bg-brandTeal text-brandTeal hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {user?.chatLockPin ? 'Configure' : 'Setup Lock'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CHATS SUB-PAGE */}
                  {activeSettingSubPage === 'chats' && (
                    <div className="space-y-5">
                      {/* Theme selection */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <span className="font-bold text-white text-xs block mb-1">App Interface Theme</span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.patch('/users/profile', { themePreference: 'dark' });
                                dispatch(updateUser({ ...user, themePreference: 'dark' } as User));
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                              (user?.themePreference || 'dark') === 'dark'
                                ? 'bg-brandTeal/10 border-brandTeal text-brandTeal font-bold shadow-md'
                                : 'bg-gray-950/40 border-gray-850 text-gray-400 hover:text-white'
                            }`}
                          >
                            <Moon className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">Dark Theme</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.patch('/users/profile', { themePreference: 'light' });
                                dispatch(updateUser({ ...user, themePreference: 'light' } as User));
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                              (user?.themePreference || 'dark') === 'light'
                                ? 'bg-brandTeal/10 border-brandTeal text-brandTeal font-bold shadow-md'
                                : 'bg-gray-950/40 border-gray-850 text-gray-450 hover:text-white'
                            }`}
                          >
                            <Sun className="w-5 h-5" />
                            <span className="text-[10px] font-semibold">Light Theme</span>
                          </button>
                        </div>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <span className="font-bold text-white text-xs block mb-1">Default Chat Font Size</span>
                        <select
                          value={localStorage.getItem('vchats_font_size') || 'medium'}
                          onChange={(e) => {
                            localStorage.setItem('vchats_font_size', e.target.value);
                            alert("Font size changed. Refreshing settings.");
                            setActiveSettingSubPage('main');
                            setTimeout(() => setActiveSettingSubPage('chats'), 1);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none focus:border-brandTeal cursor-pointer"
                        >
                          <option value="small">Small (12px)</option>
                          <option value="medium">Medium (14px)</option>
                          <option value="large">Large (16px)</option>
                        </select>
                      </div>

                      {/* Clear Wallpaper */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-xs block">Reset Chat Wallpaper</span>
                          <span className="text-[10px] text-gray-550">Reset theme wallpaper to default obsidian dark.</span>
                        </div>
                        <button
                          onClick={() => {
                            if (activeConversation) {
                              api.delete(`/chats/${activeConversation._id}/theme`)
                                .then(() => {
                                  dispatch(updateConversation({ ...activeConversation, themeImage: '' } as any));
                                  alert("Wallpaper reset.");
                                })
                                .catch(console.error);
                            } else {
                              alert("Please select a conversation first.");
                            }
                          }}
                          className="px-3 py-1.5 bg-gray-850 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-lg transition-colors border border-gray-800"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VIDEO & VOICE SUB-PAGE */}
                  {activeSettingSubPage === 'video-voice' && (
                    <div className="space-y-5">
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-3">Audio & Video Input Hardware</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Microphone Input</label>
                            <select className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none">
                              <option>Default Microphone (System Sound)</option>
                              <option>Internal Audio Input Device</option>
                              <option>External Headset Microphone</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Camera Input Device</label>
                            <select className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none">
                              <option>Integrated HD FaceTime Camera</option>
                              <option>Logitech HD webcam stream C920</option>
                              <option>OBS Virtual webcam stream input</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-gray-550 uppercase mb-1">Audio Output Speakers</label>
                            <select className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none">
                              <option>Default System Speakers (Stereo)</option>
                              <option>External Headphones Jack Port</option>
                              <option>Connected Bluetooth Audio Output</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Microphone tester */}
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <span className="font-bold text-white text-xs block mb-1">Microphone Tester Input</span>
                        <div className="flex items-center gap-3">
                          <Mic className="w-4 h-4 text-brandTeal shrink-0" />
                          <div className="flex-1 h-3 rounded-full bg-gray-900 overflow-hidden flex gap-0.5 p-0.5">
                            <div className="w-[15%] h-full bg-emerald-500 rounded animate-pulse" />
                            <div className="w-[20%] h-full bg-emerald-500 rounded animate-pulse [animation-delay:150ms]" />
                            <div className="w-[10%] h-full bg-emerald-500 rounded animate-pulse [animation-delay:300ms]" />
                            <div className="w-[5%] h-full bg-emerald-500 rounded animate-pulse [animation-delay:450ms]" />
                          </div>
                          <span className="text-[10px] text-emerald-500 font-mono">Good</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NOTIFICATIONS SUB-PAGE */}
                  {activeSettingSubPage === 'notifications' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs block mb-2 uppercase tracking-wide text-gray-550">Inbox Alerts Preference</h4>
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_notif_preview') !== 'false'}
                            onChange={(e) => localStorage.setItem('vchats_notif_preview', e.target.checked.toString())}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                          />
                          <div>
                            <span className="font-bold text-gray-200 block">Show Message Previews</span>
                            <span className="text-[10px] text-gray-550 block">Display sender and text snippets in screen notifications.</span>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3 cursor-pointer border-t border-gray-900 pt-3">
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_notif_sound') !== 'false'}
                            onChange={(e) => localStorage.setItem('vchats_notif_sound', e.target.checked.toString())}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                          />
                          <div>
                            <span className="font-bold text-gray-200 block">Play Alert Sounds</span>
                            <span className="text-[10px] text-gray-550 block">Play audible tones for incoming messages and group announcements.</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer border-t border-gray-900 pt-3">
                          <input
                            type="checkbox"
                            defaultChecked={localStorage.getItem('vchats_notif_mute') === 'true'}
                            onChange={(e) => {
                              localStorage.setItem('vchats_notif_mute', e.target.checked.toString());
                              if (e.target.checked) {
                                localStorage.setItem('vchats_notif_sound', 'false');
                              }
                            }}
                            className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal"
                          />
                          <div>
                            <span className="font-bold text-gray-200 block">Mute All Notifications</span>
                            <span className="text-[10px] text-gray-550 block">Silence all audio alerts and screen pop-up notifications.</span>
                          </div>
                        </label>
                      </div>
                      <button
                        onClick={() => alert("Notification settings saved.")}
                        className="w-full py-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold transition-all text-xs"
                      >
                        Apply Changes
                      </button>
                    </div>
                  )}

                  {/* KEYBOARD SHORTCUTS SUB-PAGE */}
                  {activeSettingSubPage === 'shortcuts' && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-xs mb-2">Workspace Quick Keyboard Actions</h4>
                      <div className="bg-gray-900/30 rounded-2xl border border-gray-900 overflow-hidden">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                              <th className="p-3 pl-4">Action</th>
                              <th className="p-3 pr-4 text-right">Shortcut keys</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-900">
                            {[
                              { act: 'Start New Direct Chat', key: 'Ctrl + N' },
                              { act: 'Next Active Conversation', key: 'Ctrl + Shift + ]' },
                              { act: 'Prev Active Conversation', key: 'Ctrl + Shift + [' },
                              { act: 'Search Message History', key: 'Ctrl + F' },
                              { act: 'Close Current Chat', key: 'Esc' },
                              { act: 'Toggle Mute Sound Alerts', key: 'Ctrl + Shift + M' }
                            ].map((s, idx) => (
                              <tr key={idx} className="hover:bg-gray-900/20">
                                <td className="p-3 pl-4 text-gray-300 font-medium">{s.act}</td>
                                <td className="p-3 pr-4 text-right"><kbd className="px-2 py-1 bg-gray-950 border border-gray-850 rounded text-[9px] font-mono font-bold text-brandTeal shadow-md">{s.key}</kbd></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* HELP & SUPPORT SUB-PAGE */}
                  {activeSettingSubPage === 'help' && (
                    <div className="space-y-5">
                      <div className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900">
                        <h4 className="font-bold text-white text-xs mb-1">Collapsible FAQ Support</h4>
                        <div className="space-y-2 mt-2">
                          {[
                            { q: "How do I secure my chats?", a: "Go to Settings > Privacy > Setup Profile Lock to configure a 4-digit PIN." },
                            { q: "What are custom lists?", a: "Use custom lists (Settings dropdown > Add to list) to tag and filter chats in the sidebar." },
                            { q: "How do disappearing messages work?", a: "Messages automatically delete from the database when their ephemeral timer runs out." }
                          ].map((faq, i) => (
                            <details key={i} className="group border-b border-gray-900/60 pb-2 cursor-pointer">
                              <summary className="font-bold text-gray-255 flex items-center justify-between text-[11px]">
                                {faq.q}
                                <span className="transition-transform group-open:rotate-180">▼</span>
                              </summary>
                              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{faq.a}</p>
                            </details>
                          ))}
                        </div>
                      </div>

                      {/* Contact form */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          alert("Thank you! Your feedback message has been sent to our support desk.");
                          setActiveSettingSubPage('main');
                        }}
                        className="space-y-3 bg-gray-900/30 p-4 rounded-2xl border border-gray-900"
                      >
                        <h4 className="font-bold text-white text-xs mb-2">Send us a direct message</h4>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Your Email</label>
                          <input type="email" required placeholder="name@domain.com" className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Feedback Message</label>
                          <textarea required placeholder="Write your issue or feedback here..." rows={3} className="w-full px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white resize-none" />
                        </div>
                        <button type="submit" className="w-full py-2 bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white rounded-xl transition-colors">
                          Send Message
                        </button>
                      </form>

                      <div className="text-center text-[10px] text-gray-550 mt-4">
                        <a href="https://vchats.com/privacy-policy" target="_blank" rel="noreferrer" className="hover:underline text-brandTeal">Privacy Policy</a> • <a href="https://vchats.com/terms" target="_blank" rel="noreferrer" className="hover:underline text-brandTeal">Terms of Service</a>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Chat Panel (Message window / Conversation pane) */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden bg-gray-950/40 relative z-10 ${
        isMobileView
          ? (showMobileChatActive && activeConversation ? 'flex' : 'hidden')
          : 'flex'
      }`}>
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="h-16 px-4 md:px-6 border-b border-gray-900 bg-gray-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Back button for mobile */}
                {isMobileView && (
                  <button
                    onClick={() => setShowMobileChatActive(false)}
                    className="p-2 rounded-lg bg-gray-900 text-gray-400 hover:text-white mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                      <img
                        src={getFileUrl(getConversationAvatar(activeConversation, currentUserId), getConversationTitle(activeConversation, currentUserId))}
                        onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(getConversationTitle(activeConversation, currentUserId)); }}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                  </div>
                </div>

                <div>
                  <span className={`font-extrabold text-white block ${isMobileView ? 'text-base' : 'text-sm'}`}>
                    {getConversationTitle(activeConversation, currentUserId)}
                  </span>
                  {activeConversation.type !== 'group' && (
                    <span className={`flex items-center gap-1 ${isMobileView ? 'text-xs' : 'text-[10px]'} ${isPeerTyping() ? 'text-brandTeal font-bold animate-pulse' : 'text-gray-500'}`}>
                      {isPeerTyping() ? (
                        'typing...'
                      ) : (() => {
                        const peer = activeConversation.participants.find((p) => {
                          const pId = typeof p === 'object' ? p._id || (p as any).id : p;
                          return pId && currentUserId && pId.toString() !== currentUserId.toString();
                        });
                        const peerId = typeof peer === 'object' && peer ? ((peer as any)._id || (peer as any).id)?.toString() : (peer as any)?.toString();
                        const isOnline = peerId && onlineUsers.includes(peerId);
                        return isOnline ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-brandTeal" /> Online
                          </>
                        ) : (
                          'Offline'
                        );
                      })()}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions & Call triggers */}
              <div className="flex items-center gap-3">
                {activeConversation.type !== 'group' && (
                  <>
                    <button
                      onClick={() => triggerCall('voice')}
                      className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerCall('video')}
                      className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white"
                      title="Video Call"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowPeerProfileSidebar(!showPeerProfileSidebar)}
                  className={`p-2 rounded-lg transition-colors ${
                    showPeerProfileSidebar
                      ? 'bg-brandTeal text-white'
                      : 'bg-gray-900 text-gray-400 hover:text-white'
                  }`}
                  title="Contact Details"
                >
                  <Info className="w-4 h-4" />
                </button>
                
                {/* WhatsApp-style Options Menu Dropdown */}
                <div className="relative" ref={menuDropdownRef}>
                  <button
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    className={`p-2 rounded-lg transition-colors ${
                      showMenuDropdown
                        ? 'bg-brandTeal text-white'
                        : 'bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                    title="Menu Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {showMenuDropdown && (
                    <div className="absolute right-0 mt-2 z-50 bg-obsidian border border-gray-800 p-2 rounded-2xl shadow-glass flex flex-col gap-1 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => {
                          setShowPeerProfileSidebar(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5 text-brandTeal" />
                        {activeConversation.type === 'group' ? 'Group details' : 'Contact info'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowChatSearch(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Search className="w-3.5 h-3.5 text-brandViolet" />
                        Search
                      </button>
                      
                      <button
                        onClick={() => {
                          setIsSelectMode(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        Select messages
                      </button>
                      
                      <button
                        onClick={() => {
                          handleToggleMuteNotifications();
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-yellow-555" />
                        {activeConversation.mutedBy?.includes(currentUserId) ? 'Unmute notifications' : 'Mute notifications'}
                      </button>
                      
                      <button
                        onClick={() => {
                          const currentDuration = disappearingDurations[activeConversation._id] || 0;
                          setSelectedDisappearingDuration(currentDuration);
                          setShowDisappearingModal(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-pink-400" />
                        Disappearing messages
                      </button>
                      
                      <button
                        onClick={() => {
                          handleToggleFavoriteChat(activeConversation);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 text-yellow-450 fill-yellow-450" />
                        {activeConversation.favorites?.includes(currentUserId) ? 'Remove from favourites' : 'Add to favourites'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowAddToListModal(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <ListPlus className="w-3.5 h-3.5 text-emerald-450" />
                        Add to list
                      </button>
                      
                      <button
                        onClick={() => {
                          dispatch(setActiveConversation(null));
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                        Close chat
                      </button>
                      
                      <button
                        onClick={() => {
                          handleSendCallLink();
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Link className="w-3.5 h-3.5 text-indigo-405" />
                        Send call link
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowScheduleCallModal(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-450" />
                        Schedule call
                      </button>
                      
                      <button
                        onClick={() => {
                          const type = window.confirm("Start Video Call? (Click OK for Video, Cancel for Voice)") ? 'video' : 'voice';
                          triggerCall(type);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-455 font-bold" />
                        &+ New group call
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowReportModal(true);
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        Report
                      </button>
                      
                      {activeConversation.type !== 'group' && (
                        <button
                          onClick={() => {
                            handleToggleBlockUser();
                            setShowMenuDropdown(false);
                          }}
                          className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-250 transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5 text-red-400" />
                          {(() => {
                            const peer = activeConversation.participants.find((p) => {
                              const pId = typeof p === 'object' ? p._id || (p as any).id : p;
                              return pId !== currentUserId;
                            });
                            const peerId = typeof peer === 'object' ? peer?._id : peer;
                            const isBlocked = user?.blockedUsers?.some((uId: any) => {
                              const id = typeof uId === 'object' ? uId._id : uId;
                              return id === peerId;
                            });
                            return isBlocked ? 'Unblock' : 'Block';
                          })()}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          handleClearChat();
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-red-500 hover:text-red-400 transition-colors border-t border-gray-900 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-550" />
                        Clear chat
                      </button>
                      
                      <button
                        onClick={() => {
                          handleDeleteChat();
                          setShowMenuDropdown(false);
                        }}
                        className="flex items-center gap-2.5 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-550" />
                        Delete chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sponsored Advertisement Banner */}
            {publicConfig?.showAds && publicConfig?.adText && (
              <a
                href={publicConfig.adTargetUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-6 mt-3 p-3 rounded-2xl bg-brandViolet/5 border border-brandViolet/25 hover:bg-brandViolet/10 hover:border-brandViolet/40 transition-all flex items-center justify-between gap-4 select-none group text-xs text-gray-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {publicConfig.adImageUrl && (
                    <img
                      src={publicConfig.adImageUrl}
                      alt="Sponsor ad"
                      className="w-9 h-9 rounded-xl object-cover border border-brandViolet/30 flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-[8px] font-extrabold uppercase bg-brandViolet/20 text-brandViolet border border-brandViolet/30 px-1.5 py-0.5 rounded tracking-widest inline-block mb-1">Sponsored</span>
                    <p className="font-semibold text-gray-300 truncate max-w-[280px] md:max-w-[450px]">
                      {publicConfig.adText}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-brandTeal hover:underline flex-shrink-0 group-hover:translate-x-1 transition-transform">
                  Details &rarr;
                </span>
              </a>
            )}

            {/* Split layout: messages on left, info sidebar on right */}
            <div className="flex-1 flex overflow-hidden relative">
              <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Search Messages Bar */}
                {showChatSearch && (
                  <div className="bg-gray-950/80 border-b border-gray-900 px-4 py-2.5 flex items-center justify-between gap-2 z-10 animate-in slide-in-from-top duration-200">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brandTeal"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setShowChatSearch(false);
                        setChatSearchQuery('');
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Conversation Messages Feed */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 transition-all duration-300"
                  style={{
                    backgroundColor: activeConversation.themeColor || undefined,
                    backgroundImage: activeConversation.themeImage ? `url(${getFileUrl(activeConversation.themeImage)})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: activeConversation.themeColor ? 'multiply' : 'normal',
                  }}
                >
                  {(activeConversation._id === 'ai-assistant' ? aiMessages : (messages || []))
                    .filter((msg) => !msg.deletedFor?.includes(currentUserId))
                    .filter((msg) => {
                      if (!chatSearchQuery.trim()) return true;
                      return msg.content && msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
                    })
                    .map((msg, index, arr) => {
                      const isMe = (msg.senderId._id || msg.senderId) === currentUserId;
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const showDateDivider = (() => {
                      if (index === 0) return true;
                      const prevMsg = arr[index - 1];
                      const curDate = new Date(msg.createdAt).toDateString();
                      const prevDate = new Date(prevMsg.createdAt).toDateString();
                      return curDate !== prevDate;
                    })();

                    const dateString = (() => {
                      const msgDate = new Date(msg.createdAt);
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      
                      if (msgDate.toDateString() === today.toDateString()) {
                        return 'Today';
                      } else if (msgDate.toDateString() === yesterday.toDateString()) {
                        return 'Yesterday';
                      } else {
                        return msgDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
                      }
                    })();

                    return (
                      <div key={msg._id} className="space-y-4">
                        {showDateDivider && (
                          <div className="flex justify-center my-6">
                            <span className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[10px] text-gray-400 font-bold tracking-wider uppercase">
                              {dateString}
                            </span>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {isSelectMode && (
                            <input
                              type="checkbox"
                              checked={selectedMessageIds.includes(msg._id)}
                              onChange={() => {
                                if (selectedMessageIds.includes(msg._id)) {
                                  setSelectedMessageIds(selectedMessageIds.filter((id) => id !== msg._id));
                                } else {
                                  setSelectedMessageIds([...selectedMessageIds, msg._id]);
                                }
                              }}
                              className="w-4 h-4 rounded text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal shrink-0 order-first cursor-pointer"
                            />
                          )}

                          {/* Hover delete trigger (trash icon) */}
                          {!msg.deletedForEveryone && !isSelectMode && (
                            <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ${isMe ? 'order-first' : 'order-last'}`}>
                              <button
                                onClick={() => setMessageToDelete(msg)}
                                className="p-1.5 rounded-lg bg-gray-900/60 hover:bg-red-955 text-gray-500 hover:text-red-400"
                                title="Delete message"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <div
                            onClick={() => {
                              if (isSelectMode) {
                                if (selectedMessageIds.includes(msg._id)) {
                                  setSelectedMessageIds(selectedMessageIds.filter((id) => id !== msg._id));
                                } else {
                                  setSelectedMessageIds([...selectedMessageIds, msg._id]);
                                }
                              }
                            }}
                            className={`max-w-[78%] md:max-w-md px-4 py-3 rounded-2xl relative shadow-md ${
                              isSelectMode ? 'cursor-pointer select-none hover:opacity-90' : ''
                            } ${
                              isMe
                                ? 'bg-brandViolet text-white rounded-tr-none'
                                : 'bg-obsidian border border-gray-800 text-gray-200 rounded-tl-none'
                            }`}
                          >
                            {msg.deletedForEveryone ? (
                              <p className="text-xs leading-relaxed italic text-gray-500 flex items-center gap-1.5 select-none">
                                <span className="text-xs">🚫</span> {isMe ? 'You deleted this message' : 'This message was deleted'}
                              </p>
                            ) : (
                              <>
                                {!isMe && (
                                  <span className="block text-[10px] font-bold text-brandTeal mb-1">
                                    @{msg.senderId.username}
                                  </span>
                                )}

                                {msg.fileUrl && (() => {
                                  const fileType = msg.type || 'image';
                                  if (fileType === 'image') {
                                    return (
                                      <div className="mb-2 rounded-xl overflow-hidden border border-gray-800">
                                        <img src={getFileUrl(msg.fileUrl)} alt="attachment" className="max-w-full h-auto object-cover max-h-60" />
                                      </div>
                                    );
                                  } else if (fileType === 'video') {
                                    return (
                                      <div className="mb-2 rounded-xl overflow-hidden border border-gray-800 max-w-full">
                                        <video controls src={getFileUrl(msg.fileUrl)} className="max-w-full rounded-xl max-h-60" />
                                      </div>
                                    );
                                  } else if (fileType === 'audio') {
                                    return (
                                      <div className="mb-2 p-1.5 bg-gray-900/60 border border-gray-800 rounded-xl flex items-center justify-center">
                                        <audio controls src={getFileUrl(msg.fileUrl)} className="max-w-xs h-9 rounded-lg" />
                                      </div>
                                    );
                                  } else {
                                    const isFolder = msg.fileName?.endsWith('.vchats.tar');
                                    if (isFolder) {
                                      return (
                                        <div className="mb-2 p-3 bg-gray-900/60 border border-gray-800 rounded-xl space-y-2.5">
                                          <div className="flex items-center gap-3">
                                            <FolderClosed className="w-8 h-8 text-amber-500 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <span className="block font-bold text-xs text-white truncate">{msg.fileName?.replace('.vchats.tar', '') || 'Folder'}</span>
                                              <span className="block text-[9px] text-gray-500">Folder Archive • {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'Unknown Size'}</span>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => unpackTarFolder(getFileUrl(msg.fileUrl)!, msg.fileName!)}
                                            className="w-full py-1.5 rounded-lg bg-gray-950 hover:bg-gray-900 text-center text-[10px] font-bold text-brandTeal border border-gray-800"
                                          >
                                            Unpack & Download Folder Files
                                          </button>
                                        </div>
                                      );
                                    }
                                    return (
                                      <a
                                        href={getFileUrl(msg.fileUrl)}
                                        download={msg.fileName || 'Attachment'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mb-2 flex items-center gap-3 p-3 bg-gray-900/60 border border-gray-800 rounded-xl hover:bg-gray-900 transition-colors"
                                      >
                                        <FileText className="w-8 h-8 text-brandViolet shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <span className="block font-bold text-xs text-white truncate">{msg.fileName || 'Document'}</span>
                                          <span className="block text-[9px] text-gray-500">{msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'Unknown Size'}</span>
                                        </div>
                                      </a>
                                    );
                                  }
                                })()}

                                {msg.type === 'contact' && (
                                  <div className="mb-2 p-3 bg-gray-900/60 border border-gray-800 rounded-xl flex items-center gap-3">
                                    <UserIcon className="w-8 h-8 text-brandTeal bg-brandTeal/10 p-1.5 rounded-full shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <span className="block font-bold text-xs text-white truncate">{msg.content.split(' - ')[0] || 'Contact Card'}</span>
                                      <span className="block text-[10px] text-gray-400 truncate">{msg.content.split(' - ')[1] || 'Shared Contact'}</span>
                                    </div>
                                  </div>
                                )}

                                {msg.type !== 'contact' && (
                                  <p className={`leading-relaxed whitespace-pre-wrap ${isMobileView ? 'text-base font-medium' : 'text-sm'}`}>{msg.content}</p>
                                )}

                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                  {msg.isDisappearing && (
                                    <span title="Disappearing message"><Clock className="w-2.5 h-2.5 text-pink-400 shrink-0" /></span>
                                  )}
                                  <span className="text-[9px] text-gray-400">{formattedTime}</span>
                                  {isMe && (() => {
                                    const isRead = msg.seenBy?.some((s: any) => {
                                      const sUid = typeof s === 'object' ? s.userId?._id || s.userId || s : s;
                                      return sUid !== currentUserId;
                                    });
                                    if (isRead) {
                                      return <span title="Seen"><CheckCheck className="w-3.5 h-3.5 text-brandTeal" /></span>;
                                    } else if (msg.status === 'delivered') {
                                      return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-gray-500" /></span>;
                                    } else {
                                      return <span title="Sent"><Check className="w-3.5 h-3.5 text-gray-500" /></span>;
                                    }
                                  })()}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {getTypingText() && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pl-4 py-1 animate-pulse">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brandTeal animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brandTeal animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-brandTeal animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>{getTypingText()}</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {showScrollBottomBtn && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-8 w-11 h-11 rounded-full bg-brandTeal hover:bg-brandTeal-dark text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 z-40"
                    title="Scroll to bottom"
                  >
                    <ArrowDown className="w-5 h-5" />
                    {unreadMessageCountAfterScroll > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-obsidian">
                        {unreadMessageCountAfterScroll}
                      </span>
                    )}
                  </button>
                )}

                {/* Message Input Panel */}
                {scheduledTime && (
                  <div className="px-4 py-2 bg-brandViolet/10 border-t border-brandViolet/30 text-brandViolet text-xs flex items-center justify-between">
                    <span>🕒 Message scheduled for: <b>{new Date(scheduledTime).toLocaleString()}</b></span>
                    <button
                      onClick={() => setScheduledTime(null)}
                      className="text-red-400 hover:text-red-500 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {selectedMessageFile && (
                  <div className="px-4 py-2 bg-brandTeal/10 border-t border-brandTeal/30 text-brandTeal text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Paperclip className="w-3.5 h-3.5" /> Attachment: <b>{selectedMessageFile.name}</b> ({Math.round(selectedMessageFile.size / 1024)} KB)
                    </span>
                    <button
                      onClick={() => setSelectedMessageFile(null)}
                      className="text-red-400 hover:text-red-500 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {isSelectMode ? (
                  <div className="p-4 border-t border-gray-900 bg-gray-950/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
                    <div className="text-xs text-gray-450 font-extrabold">
                      {selectedMessageIds.length} message(s) selected
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteSelectedMessages}
                        disabled={selectedMessageIds.length === 0}
                        className="px-4 py-2 bg-red-650 hover:bg-red-750 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedMessageIds([]);
                        }}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-900 bg-gray-950/60 flex items-center gap-3">
                  <div className="relative flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 rounded-xl bg-gray-900 text-gray-400 hover:text-white"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    {activeConversation?._id !== 'ai-assistant' && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                          className="p-2.5 rounded-xl bg-gray-900 text-gray-400 hover:text-white"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                        {showAttachmentDropdown && (
                          <div className="absolute bottom-14 left-0 z-50 bg-obsidian border border-gray-800 p-2 rounded-2xl shadow-glass flex flex-col gap-1 w-44 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <button
                              type="button"
                              onClick={() => triggerFileInput('gallery')}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <Image className="w-4 h-4 text-brandTeal" /> Gallery (Image/Video)
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerFileInput('document')}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-brandViolet" /> Document
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerFileInput('audio')}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <Volume2 className="w-4 h-4 text-sky-400" /> Upload Audio File
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentDropdown(false);
                                startRecording('audio');
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <Mic className="w-4 h-4 text-red-400" /> Record Voice Note
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentDropdown(false);
                                startRecording('video');
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <Video className="w-4 h-4 text-emerald-400" /> Record Video Clip
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentDropdown(false);
                                setShowShareContactModal(true);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <UserIcon className="w-4 h-4 text-blue-400" /> Share Contact
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentDropdown(false);
                                folderInputRef.current?.click();
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-gray-900 rounded-xl text-left text-xs text-gray-200 transition-colors"
                            >
                              <FolderClosed className="w-4 h-4 text-amber-500" /> Upload Folder
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <input
                      type="file"
                      ref={attachmentInputRef}
                      onChange={handleAttachmentChange}
                      accept={getAcceptAttribute()}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={folderInputRef}
                      onChange={handleFolderUploadChange}
                      {...{ webkitdirectory: "", directory: "", multiple: true }}
                      className="hidden"
                    />
                  </div>
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-0 z-50">
                      <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={(emoji: EmojiClickData) => setMessageInput(messageInput + emoji.emoji)}
                      />
                    </div>
                  )}

                  {recordingType ? (
                    // Inline Recorder Panel
                    <div className={`flex-grow flex gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl animate-in slide-in-from-bottom duration-200 select-none ${
                      isMobileView ? 'flex-col items-stretch' : 'items-center justify-between'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isRecording ? 'animate-pulse' : ''}`} />
                          <span className="text-[10px] font-mono font-bold text-white shrink-0">
                            {isRecording ? 'RECORDING' : 'PREVIEW'} ({Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')})
                          </span>
                        </div>

                        {recordingType === 'video' && isRecording && recordingStreamRef.current && (
                          <div className="w-12 h-9 rounded-lg overflow-hidden border border-brandTeal bg-black shrink-0">
                            <video
                              ref={(el) => {
                                if (el) el.srcObject = recordingStreamRef.current;
                              }}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {recordedUrl && (
                          <div className="flex items-center gap-2 shrink-0">
                            {recordingType === 'video' ? (
                              <video src={recordedUrl} controls className="h-9 w-14 rounded-lg border border-gray-850" />
                            ) : (
                              <audio src={recordedUrl} controls className="h-7 max-w-[120px] rounded" />
                            )}
                          </div>
                        )}
                      </div>

                      {recordedUrl && (
                        <input
                          type="text"
                          placeholder="Add a caption..."
                          value={recordingCaption}
                          onChange={(e) => setRecordingCaption(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-gray-955 text-xs text-white border border-gray-850 focus:outline-none focus:border-brandTeal"
                        />
                      )}

                      <div className="flex items-center gap-2 justify-end">
                        {isRecording ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelRecording}
                              className="px-3 py-1 rounded-xl bg-red-950/40 hover:bg-red-950/60 text-red-400 text-[10px] font-bold transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={stopRecording}
                              className="px-3 py-1 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white text-[10px] font-bold transition-all"
                            >
                              Stop
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startRecording(recordingType)}
                              className="px-3 py-1 rounded-xl bg-gray-950 hover:bg-gray-850 text-gray-400 hover:text-white text-[10px] font-bold transition-all"
                            >
                              Re-record
                            </button>
                            <button
                              type="button"
                              onClick={cancelRecording}
                              className="px-3 py-1 rounded-xl bg-red-950/30 hover:bg-red-950/50 text-red-400 text-[10px] font-bold transition-all"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={handleSendRecordedMessage}
                              className="px-3 py-1 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white text-[10px] font-bold transition-all"
                            >
                              Send
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={activeConversation?._id === 'ai-assistant' ? "Ask the AI assistant..." : "Type a message..."}
                      value={messageInput}
                      onChange={handleTyping}
                      className={`flex-1 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-white ${isMobileView ? 'text-base' : 'text-sm'}`}
                    />
                  )}

                  {!recordingType && activeConversation?._id !== 'ai-assistant' && (
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(true)}
                      className={`p-2.5 rounded-xl transition-all ${
                        scheduledTime
                          ? 'bg-brandViolet text-white animate-pulse shadow-md'
                          : 'bg-gray-900 text-gray-400 hover:text-white'
                      }`}
                      title="Schedule Message"
                    >
                      <Clock className="w-5 h-5" />
                    </button>
                  )}

                  {!recordingType && (
                    <button
                      type="submit"
                      className="p-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  )}
                </form>
                )}
              </div>

              {showPeerProfileSidebar && (
                <div className="w-80 border-l border-gray-900 bg-gray-950/85 h-full overflow-y-auto flex flex-col z-20 animate-in slide-in-from-right duration-250 select-none">
                  {showMediaBrowser ? (
                    // WhatsApp-style Media, Links, and Docs Browser Sub-pane
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-gray-900 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowMediaBrowser(false)}
                          className="p-1 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="font-extrabold text-sm text-white">Media, Links & Docs</span>
                      </div>

                      {/* Tabs */}
                      <div className="grid grid-cols-3 border-b border-gray-900 bg-gray-950/40 text-center text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setMediaTab('media')}
                          className={`py-3 transition-colors ${mediaTab === 'media' ? 'border-b-2 border-brandTeal text-brandTeal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Media
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaTab('docs')}
                          className={`py-3 transition-colors ${mediaTab === 'docs' ? 'border-b-2 border-brandTeal text-brandTeal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Docs
                        </button>
                        <button
                          type="button"
                          onClick={() => setMediaTab('links')}
                          className={`py-3 transition-colors ${mediaTab === 'links' ? 'border-b-2 border-brandTeal text-brandTeal' : 'text-gray-400 hover:text-white'}`}
                        >
                          Links
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        {mediaTab === 'media' && (() => {
                          const mediaMsgs = (messages || []).filter((m) => (m.type === 'image' || m.type === 'video') && m.fileUrl);
                          if (mediaMsgs.length === 0) {
                            return <div className="text-center text-xs text-gray-500 py-12">No media shared yet.</div>;
                          }
                          return (
                            <div className="grid grid-cols-3 gap-2">
                              {mediaMsgs.map((m) => (
                                <a
                                  key={m._id}
                                  href={getFileUrl(m.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="aspect-square rounded-xl overflow-hidden border border-gray-800 bg-black group relative"
                                >
                                  {m.type === 'video' ? (
                                    <video src={getFileUrl(m.fileUrl)} className="w-full h-full object-cover pointer-events-none" />
                                  ) : (
                                    <img src={getFileUrl(m.fileUrl)} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-[9px] font-bold text-white capitalize">{m.type}</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          );
                        })()}

                        {mediaTab === 'docs' && (() => {
                          const docMsgs = (messages || []).filter((m) => m.type === 'document' && m.fileUrl);
                          if (docMsgs.length === 0) {
                            return <div className="text-center text-xs text-gray-500 py-12">No docs shared yet.</div>;
                          }
                          return (
                            <div className="space-y-2">
                              {docMsgs.map((m) => {
                                const isFolder = m.fileName?.endsWith('.vchats.tar');
                                return (
                                  <div key={m._id} className="p-2 bg-gray-900/30 border border-gray-800 rounded-xl flex items-center gap-2">
                                    {isFolder ? (
                                      <FolderClosed className="w-5 h-5 text-amber-500 shrink-0" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-brandViolet shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <span className="block font-semibold text-[10px] text-white truncate">{m.fileName?.replace('.vchats.tar', '') || 'Document'}</span>
                                      <span className="block text-[8px] text-gray-500">{m.fileSize ? `${Math.round(m.fileSize / 1024)} KB` : 'Unknown Size'}</span>
                                    </div>
                                    {isFolder ? (
                                      <button
                                        type="button"
                                        onClick={() => unpackTarFolder(getFileUrl(m.fileUrl)!, m.fileName!)}
                                        className="p-1 text-[8px] font-bold text-brandTeal hover:underline"
                                      >
                                        Unpack
                                      </button>
                                    ) : (
                                      <a
                                        href={getFileUrl(m.fileUrl)}
                                        download={m.fileName || 'Attachment'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-[8px] font-bold text-brandTeal hover:underline"
                                      >
                                        Get
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {mediaTab === 'links' && (() => {
                          const linkRegex = /(https?:\/\/[^\s]+)/g;
                          const linkMsgs = (messages || []).filter((m) => m.content && linkRegex.test(m.content));
                          if (linkMsgs.length === 0) {
                            return <div className="text-center text-xs text-gray-500 py-12">No links shared yet.</div>;
                          }
                          return (
                            <div className="space-y-2">
                              {linkMsgs.map((m) => {
                                const foundLinks = m.content.match(linkRegex);
                                return (
                                  <div key={m._id} className="p-2 bg-gray-900/30 border border-gray-800 rounded-xl space-y-1">
                                    <span className="text-[8px] text-gray-500 block">
                                      {m.senderId.displayName || 'Sender'}
                                    </span>
                                    {foundLinks?.map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block text-[10px] font-bold text-brandTeal hover:underline truncate"
                                      >
                                        🔗 {url}
                                      </a>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-gray-900 flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">
                          {activeConversation.type === 'group' ? 'Group Details' : 'Contact Info'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPeerProfileSidebar(false)}
                          className="p-1 rounded-lg hover:bg-gray-900 text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {activeConversation.type === 'group' ? (
                // Group Info Panel
                (() => {
                  const group = activeConversation.groupId;
                  if (!group) return <div className="p-6 text-center text-xs text-gray-500">Group details unavailable.</div>;
                  
                  const isCreator = group.creator?._id === currentUserId || group.creator === currentUserId;

                  return (
                    <div className="p-6 flex-1 flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center font-bold text-3xl text-gray-450 overflow-hidden shadow-lg border border-gray-850">
                          <img
                            src={getFileUrl(group.avatar, group.name)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(group.name); }}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="font-extrabold text-base text-white text-center mt-2">{group.name}</h4>
                        <span className="text-xs text-gray-500 font-medium">Group Chat</span>
                      </div>

                      <div className="space-y-4">
                        {group.description && (
                          <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-900/50">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Description</span>
                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{group.description}</p>
                          </div>
                        )}

                        {/* Members Collapsible list */}
                        <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-900/50 space-y-3">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block animate-pulse">
                            Members ({activeConversation.participants.length})
                          </span>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                            {activeConversation.participants.map((m) => (
                              <div key={m._id} className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-brandTeal/20 flex items-center justify-center font-extrabold text-[9px] text-white">
                                  <img
                                    src={getFileUrl(m.profilePhoto, m.displayName || m.username)}
                                    onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(m.displayName || m.username); }}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-xs text-gray-300 truncate flex-1">{m.displayName}</span>
                                {m._id === currentUserId && <span className="text-[8px] bg-brandTeal/20 text-brandTeal px-1.5 py-0.5 rounded">You</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Theme settings */}
                        {renderThemeSelection()}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-900 flex flex-col gap-2">
                        {(!group.settings?.restrictInfoEditing || isCreator) && (
                          <button
                            onClick={() => {
                              setEditGroupName(group.name);
                              setEditGroupDescription(group.description || '');
                              setShowEditGroupModal(true);
                            }}
                            className="w-full py-2 rounded-xl bg-gray-905 hover:bg-gray-900 border border-gray-800 text-xs font-bold text-brandTeal transition-colors"
                          >
                            Edit Group Details
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteChat(activeConversation)}
                          className="w-full py-2 rounded-xl bg-gray-905 hover:bg-gray-900 border border-gray-800 text-xs font-bold text-yellow-500 transition-colors flex items-center justify-center gap-2"
                        >
                          ⭐ {activeConversation.favorites?.includes(currentUserId) ? 'Remove Favorite' : 'Mark as Favorite'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLockChat(activeConversation)}
                          className="w-full py-2 rounded-xl bg-gray-905 hover:bg-gray-900 border border-gray-800 text-xs font-bold text-brandTeal transition-colors flex items-center justify-center gap-2"
                        >
                          🔒 {activeConversation.lockedBy?.includes(currentUserId) ? 'Unlock Group' : 'Lock Group'}
                        </button>
                        <button
                          onClick={handleLeaveGroup}
                          className="w-full py-2 rounded-xl bg-gray-905 hover:bg-red-950/20 border border-gray-800 text-xs font-bold text-red-500 transition-colors"
                        >
                          Leave Group
                        </button>
                        {isCreator && (
                          <button
                            onClick={handleDeleteChat}
                            className="w-full py-2.5 rounded-xl bg-red-650 hover:bg-red-700 text-xs font-bold text-white transition-colors"
                          >
                            Delete Group
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                // DM Chat Info Panel
                (() => {
                  const peer = activeConversation.participants.find((p) => {
                    const pId = typeof p === 'object' ? p._id || (p as any).id : p;
                    return pId !== currentUserId;
                  });
                  if (!peer || typeof peer !== 'object') {
                    return (
                      <div className="p-6 text-center text-xs text-gray-500">
                        Profile details unavailable.
                      </div>
                    );
                  }

                  const peerId = peer._id?.toString() || (peer as any).id?.toString();
                  const isOnline = peerId && onlineUsers.includes(peerId);

                  return (
                    <div className="p-6 flex-1 flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center font-bold text-3xl text-gray-450 overflow-hidden shadow-lg border border-gray-850">
                          <img
                            src={getFileUrl(peer.profilePhoto, peer.displayName || peer.username)}
                            onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(peer.displayName || peer.username); }}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="font-extrabold text-base text-white text-center mt-2">{peer.displayName}</h4>
                        <span className="text-xs text-gray-500 font-medium">@{peer.username}</span>
                      </div>

                      <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-900 flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-brandTeal animate-pulse' : 'bg-gray-700'}`} />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-white block">
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                          {!isOnline && peer.lastSeen && (
                            <span className="text-[10px] text-gray-500 block truncate">
                              Last seen: {new Date(peer.lastSeen).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-900/50">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">About & Bio</span>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {peer.bio || peer.about || 'Hey there! I am using VChats.'}
                          </p>
                        </div>

                        <div className="bg-gray-900/20 p-4 rounded-2xl border border-gray-900/50">
                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-0.5">Email Address</span>
                          <span className="text-xs text-gray-300 block truncate select-text">{peer.email}</span>
                        </div>

                        {/* Theme settings */}
                        {renderThemeSelection()}
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-900 flex flex-col gap-2">
                        <button
                          onClick={handleDeleteChat}
                          className="w-full py-2.5 rounded-xl bg-red-650/20 hover:bg-red-650 text-xs font-bold text-red-500 hover:text-white transition-colors"
                        >
                          Delete Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleFavoriteChat(activeConversation)}
                          className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-bold text-yellow-500 transition-colors flex items-center justify-center gap-2"
                        >
                          ⭐ {activeConversation.favorites?.includes(currentUserId) ? 'Remove Favorite' : 'Mark as Favorite'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLockChat(activeConversation)}
                          className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-bold text-brandTeal transition-colors flex items-center justify-center gap-2"
                        >
                          🔒 {activeConversation.lockedBy?.includes(currentUserId) ? 'Unlock Chat' : 'Lock Chat'}
                        </button>
                        <button
                          onClick={() => triggerCall('voice')}
                          className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                        >
                          <Phone className="w-3.5 h-3.5" /> Voice Call
                        </button>
                        <button
                          onClick={() => triggerCall('video')}
                          className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                        >
                          <Video className="w-3.5 h-3.5" /> Video Call
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}
        </div>
      </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-gradient flex items-center justify-center font-bold text-4xl text-white shadow-glass mb-4">
              V
            </div>
            <h3 className="text-xl font-extrabold text-white">VChats Secure Messaging</h3>
            <p className="text-gray-500 text-sm max-w-sm mt-2 leading-relaxed">
              {getTranslation('select_chat')}
            </p>
          </div>
        )}
      </div>
      {/* 4. Active Calling Video/Audio Screen Overlays */}
      <AnimatePresence>
        {callState.callStatus !== 'idle' && callState.callStatus !== 'ended' && (
          isCallMinimized ? (
            /* Minimized call overlay (WhatsApp Style Floating PiP Window) */
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 50 }}
              className="fixed bottom-4 right-4 w-72 h-44 bg-gray-950 border border-brandTeal shadow-glass rounded-2xl flex flex-col justify-between p-3 z-50 text-white overflow-hidden select-none"
            >
              {/* If Video Call and remoteStream active, use remote video as background */}
              {callState.callType === 'video' && remoteStream && callState.peerUser?.id !== 'group' ? (
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                  }}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              ) : null}

              {/* In group video, show the first remote stream as background */}
              {callState.callType === 'video' && callState.peerUser?.id === 'group' && remoteStreams.length > 0 && remoteStreams[0].stream ? (
                <video
                  ref={(el) => {
                    if (el && el.srcObject !== remoteStreams[0].stream) el.srcObject = remoteStreams[0].stream;
                  }}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              ) : null}

              {/* PiP Overlay Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/60 z-10 p-3 flex flex-col justify-between">
                {/* Header: Peer info & Timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 font-sans">
                    <div className="w-6 h-6 rounded-full bg-brandViolet flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shrink-0">
                      {callState.peerUser?.profilePhoto ? (
                        <img src={getFileUrl(callState.peerUser.profilePhoto)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        callState.peerUser?.displayName?.charAt(0) || 'C'
                      )}
                    </div>
                    <span className="text-[11px] font-extrabold truncate max-w-[110px]">
                      {callState.peerUser?.displayName || 'Group Call'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-gray-900/90 border border-gray-800 px-1.5 py-0.5 rounded">
                    {callState.callStatus === 'ringing' ? 'Calling...' : formatCallDuration(callDuration)}
                  </span>
                </div>

                {/* Body/Middle: peer status indicators */}
                <div className="flex flex-col items-center justify-center flex-1">
                  {/* If voice call or no stream connected */}
                  {(callState.callType === 'voice' || (!remoteStream && callState.peerUser?.id !== 'group')) && (
                    <div className="w-11 h-11 rounded-full bg-brandViolet flex items-center justify-center text-xl shadow-md border border-brandViolet/50 animate-pulse">
                      📞
                    </div>
                  )}
                  {/* Realtime peer mute / camera indicators */}
                  {callState.peerUser && callState.peerUser.id !== 'group' && (
                    <div className="flex gap-1.5 mt-2">
                      {peerStates[callState.peerUser.id]?.isMuted && (
                        <span className="text-[8px] bg-red-600/90 border border-red-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white">Muted</span>
                      )}
                      {peerStates[callState.peerUser.id]?.isCameraOff && (
                        <span className="text-[8px] bg-gray-800/90 border border-gray-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white">Cam Off</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Controls: Quick controls */}
                <div className="flex items-center justify-between pointer-events-auto">
                  <button
                    onClick={() => toggleMute(!isMuted)}
                    className={`p-2 rounded-full transition-all ${
                      isMuted ? 'bg-red-600 text-white' : 'bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-855'
                    }`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  <button
                    onClick={hangup}
                    className="p-2 rounded-full bg-red-650 hover:bg-red-700 text-white transition-all hover:scale-105"
                    title="End Call"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsCallMinimized(false)}
                    className="p-2 rounded-full bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-855 transition-all"
                    title="Maximize Call"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Fullscreen call overlay */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center text-white ${
                isMobileView ? 'p-0' : 'p-4'
              }`}
            >
              <div className={`relative w-full bg-gray-950 overflow-hidden flex flex-col items-center justify-between shadow-glass ${
                isMobileView 
                  ? 'h-full w-full rounded-none border-none p-6 pb-24' 
                  : 'max-w-md aspect-[9/16] max-h-[80vh] rounded-3xl border border-gray-900 p-8'
              }`}>
                
                {/* Group Calling vs 1-to-1 Calling Layouts */}
                {callState.peerUser?.id === 'group' ? (
                  <div className="absolute inset-0 w-full h-full flex flex-col z-10 p-4">
                    <div className="text-center mb-4">
                      <span className="font-extrabold text-sm text-white block">
                        {callState.peerUser?.displayName || 'Group Call'}
                      </span>
                      <span className="text-[10px] text-brandTeal font-bold">
                        {callState.callStatus === 'ringing' ? 'Calling group...' : `Connected (${callDuration}s)`}
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto p-1">
                      {/* Local Feed */}
                      {callState.callType === 'video' && localStream && (
                        <div className="relative bg-gray-950 rounded-2xl overflow-hidden aspect-[3/4] border border-brandTeal/30">
                          <video
                            ref={(el) => {
                              if (el && el.srcObject !== localStream) el.srcObject = localStream;
                            }}
                            autoPlay
                            muted
                            playsInline
                            style={{ filter: getVideoFilterStyle() }}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-white">
                            You
                          </span>
                        </div>
                      )}

                      {/* Group Audio Elements */}
                      {remoteStreams.map((peer) => (
                        <audio
                          key={`audio-${peer.userId}`}
                          ref={(el) => {
                            if (el && el.srcObject !== peer.stream) {
                              el.srcObject = peer.stream;
                              el.play().catch((err) => console.error('Group peer audio playback error:', err));
                            }
                          }}
                          autoPlay
                          playsInline
                        />
                      ))}

                      {/* Remote Feeds */}
                      {callState.callType === 'video' && remoteStreams.map((peer) => (
                        <div key={peer.userId} className="relative bg-gray-950 rounded-2xl overflow-hidden aspect-[3/4] border border-gray-800">
                          {peerStates[peer.userId]?.isCameraOff ? (
                            <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center p-4">
                              <span className="text-[10px] font-bold text-gray-550 uppercase tracking-widest block mb-1">Camera Off</span>
                              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-sm text-gray-400 font-bold border border-gray-700">
                                {peer.username?.charAt(0).toUpperCase() || 'P'}
                              </div>
                            </div>
                          ) : (
                            <video
                              ref={(el) => {
                                if (el && el.srcObject !== peer.stream) el.srcObject = peer.stream;
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-1">
                            {peer.username || 'Participant'}
                            {peerStates[peer.userId]?.isMuted && (
                              <VolumeX className="w-2.5 h-2.5 text-red-500" />
                            )}
                          </span>
                        </div>
                      ))}

                      {/* Voice-only representation */}
                      {callState.callType === 'voice' && (
                        <div className="col-span-2 flex flex-col items-center justify-center gap-6 py-12">
                          <div className="w-20 h-20 rounded-2xl bg-teal-gradient p-0.5 flex items-center justify-center animate-pulse">
                            <div className="w-full h-full rounded-2xl bg-gray-955 flex items-center justify-center text-2xl">
                              📞
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="font-bold text-xs text-white block">Active Voice Group</span>
                            <span className="text-[9px] text-gray-500 mt-1 block">
                              {remoteStreams.length + 1} participants connected
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Remote Audio Element to guarantee incoming sound for Voice & Video calls */}
                    {remoteStream && (
                      <audio
                        ref={(el) => {
                          if (el && el.srcObject !== remoteStream) {
                            el.srcObject = remoteStream;
                            el.play().catch((err) => console.error('Remote audio playback error:', err));
                          }
                        }}
                        autoPlay
                        playsInline
                      />
                    )}

                    {/* Z-0: Background Remote Video for Video Call */}
                    {callState.callType === 'video' && remoteStream && (!callState.peerUser || !peerStates[callState.peerUser.id]?.isCameraOff) ? (
                      <video
                        ref={(el) => {
                          if (el && el.srcObject !== remoteStream) el.srcObject = remoteStream;
                        }}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />
                    ) : null}

                    {/* Z-10: Self view PiP floating at Top-Right */}
                    {callState.callType === 'video' && localStream && (
                      <div className="absolute top-4 right-4 w-28 h-40 bg-gray-900 rounded-2xl overflow-hidden border-2 border-brandTeal shadow-md z-20">
                        {isCameraOff ? (
                          <div className="w-full h-full bg-gray-955 flex flex-col items-center justify-center text-[10px] text-gray-500 font-bold">
                            <span>Camera Off</span>
                          </div>
                        ) : (
                          <video
                            ref={(el) => {
                              if (el && el.srcObject !== localStream) el.srcObject = localStream;
                            }}
                            autoPlay
                            muted
                            playsInline
                            style={{ filter: getVideoFilterStyle() }}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* Z-10: Audio Calling details or Video connecting details */}
                    <div className="flex flex-col items-center justify-center z-10 w-full flex-1">
                      {(callState.callType === 'voice' || !remoteStream || (callState.peerUser && peerStates[callState.peerUser.id]?.isCameraOff)) && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-28 h-28 rounded-full bg-brandViolet/20 animate-ping" />
                            <div className="absolute w-24 h-24 rounded-full bg-brandViolet/40 animate-pulse" />
                            <div className="w-20 h-20 rounded-full bg-brandViolet flex items-center justify-center text-3xl font-bold text-white shadow-lg z-10 border border-brandViolet/50 overflow-hidden">
                              <img
                                src={getFileUrl(callState.peerUser?.profilePhoto, callState.peerUser?.displayName || 'Caller')}
                                onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(callState.peerUser?.displayName || 'Caller'); }}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          
                          <div className="text-center mt-2">
                            <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                              {callState.peerUser?.displayName}
                            </h2>
                            <span className="text-xs font-mono text-gray-550 block mt-1">
                              @{callState.peerUser?.username}
                            </span>
                            {/* Visual Peer Mute indicator */}
                            {callState.peerUser && peerStates[callState.peerUser.id]?.isMuted && (
                              <div className="mt-3 inline-flex items-center gap-1.5 bg-red-600/90 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold text-white tracking-wide shadow-md">
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Muted</span>
                              </div>
                            )}
                            {callState.peerUser && peerStates[callState.peerUser.id]?.isCameraOff && callState.callType === 'video' && (
                              <div className="mt-2 text-xs font-bold text-gray-550 tracking-wider">
                                CAMERA TURNED OFF
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Top Meta info */}
                    <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brandViolet flex items-center justify-center font-bold text-white shadow-md overflow-hidden border border-brandViolet/50 shrink-0">
                          {callState.peerUser?.profilePhoto ? (
                            <img src={getFileUrl(callState.peerUser.profilePhoto)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            callState.peerUser?.displayName?.charAt(0) || 'C'
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{callState.peerUser?.displayName}</span>
                          <span className="text-[10px] text-gray-400 block truncate">@{callState.peerUser?.username}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-gray-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider uppercase">HD 1080p</span>
                          <div className="flex items-end gap-0.5 h-2.5 ml-1">
                            <span className="w-0.5 h-1 bg-emerald-400 rounded-xs" />
                            <span className="w-0.5 h-1.5 bg-emerald-400 rounded-xs" />
                            <span className="w-0.5 h-2.5 bg-emerald-400 rounded-xs" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-widest text-brandTeal font-bold flex items-center gap-1">
                            🔒 Encrypted
                          </span>
                          <span className="text-xs text-white font-bold font-mono bg-gray-900/80 px-2 py-0.5 rounded-md border border-gray-800">
                            {callState.callStatus === 'ringing' ? 'Ringing...' : formatCallDuration(callDuration)}
                          </span>
                        </div>
                        {/* Minimize Action Button */}
                        <div className="flex items-center gap-2 pointer-events-auto mt-1">
                          <button
                            onClick={() => setIsCallMinimized(true)}
                            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-gray-300 hover:text-white border border-gray-800 flex items-center justify-center transition-all hover:scale-105 shadow-md"
                            title="Minimize Call"
                          >
                            <Minimize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Floating Bottom Control Actions */}
                <div className="w-full flex items-center justify-center gap-4 z-30 pt-4 border-t border-white/5 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 p-6 rounded-b-3xl">
                  {callState.callStatus === 'ringing' && !callState.isCaller ? (
                    <>
                      <button
                        onClick={handleAnswerCall}
                        className="p-4 rounded-full bg-brandTeal hover:bg-brandTeal-dark text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
                        title="Answer Call"
                      >
                        {callState.callType === 'video' ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                      </button>
                      <button
                        onClick={handleRejectCall}
                        className="p-4 rounded-full bg-red-650 hover:bg-red-755 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
                        title="Reject Call"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Local Microphone Mute */}
                      <button
                        onClick={() => toggleMute(!isMuted)}
                        className={`p-3.5 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 ${
                          isMuted ? 'bg-red-650 text-white hover:bg-red-700' : 'bg-gray-900 text-gray-400 hover:text-white'
                        }`}
                        title={isMuted ? "Unmute Audio" : "Mute Audio"}
                      >
                        <Mic className={`w-5 h-5 ${isMuted ? 'text-white' : 'text-gray-400'}`} />
                      </button>

                      {/* Speaker Output Control */}
                      <button
                        onClick={() => toggleSpeaker(!isSpeakerOn)}
                        className={`p-3.5 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 ${
                          !isSpeakerOn ? 'bg-red-655 text-white hover:bg-red-700' : 'bg-gray-900 text-gray-400 hover:text-white'
                        }`}
                        title={isSpeakerOn ? "Mute Speaker Output" : "Speaker Output On"}
                      >
                        {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-white" />}
                      </button>
                      
                      {/* Screenshare (Video Call Only) */}
                      {callState.callType === 'video' && (
                        <button
                          onClick={toggleScreenShare}
                          className={`p-3.5 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 ${
                            isSharingScreen ? 'bg-brandTeal text-white animate-pulse' : 'bg-gray-900 text-gray-400 hover:text-white'
                          }`}
                          title={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
                        >
                          <Monitor className="w-5 h-5" />
                        </button>
                      )}

                      {/* End Call / Hangup */}
                      <button
                        onClick={hangup}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-755 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
                        title="End Call"
                      >
                        <LogOut className="w-6 h-6" />
                      </button>

                      {/* Flip Camera (Video Call Only) */}
                      {callState.callType === 'video' && hasMultipleCameras && (
                        <button
                          onClick={flipCamera}
                          className="p-3.5 rounded-full bg-gray-900 text-gray-400 hover:text-white shadow-md flex items-center justify-center transition-all hover:scale-105"
                          title="Flip Camera"
                        >
                          <RotateCw className="w-5 h-5" />
                        </button>
                      )}

                      {/* Camera Filters (Video Call Only) */}
                      {callState.callType === 'video' && (
                        <button
                          onClick={() => setShowVideoFiltersMenu(!showVideoFiltersMenu)}
                          className={`p-3.5 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 ${
                            showVideoFiltersMenu || activeVideoFilter !== 'none' ? 'bg-brandTeal text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
                          }`}
                          title="Camera Filters"
                        >
                          <Sliders className="w-5 h-5" />
                        </button>
                      )}

                      {/* Local Video Toggle (Video Call Only) */}
                      {callState.callType === 'video' && (
                        <button
                          onClick={() => toggleCamera(!isCameraOff)}
                          className={`p-3.5 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 ${
                            isCameraOff ? 'bg-red-650 text-white hover:bg-red-700' : 'bg-gray-900 text-gray-400 hover:text-white'
                          }`}
                          title={isCameraOff ? "Enable Video" : "Disable Video"}
                        >
                          <Video className={`w-5 h-5 ${isCameraOff ? 'text-white' : 'text-gray-400'}`} />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* In-Call Reactions Bar */}
                {callState.callStatus === 'connected' && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-850 shadow-xl z-30 select-none">
                    {['👍', '❤️', '😂', '🎉', '😮'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => sendCallReaction(emoji)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm hover:scale-125 transition-all active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Video Filters Menu Overlay */}
                {showVideoFiltersMenu && callState.callType === 'video' && (
                  <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-1 bg-gray-955 border border-gray-850 p-2 rounded-2xl shadow-2xl z-30 min-w-[120px] text-xs">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-2 py-1 select-none">Filters</span>
                    {([
                      { key: 'none', label: 'Normal' },
                      { key: 'beauty', label: 'Beauty ✨' },
                      { key: 'blur', label: 'Blur 🌫️' },
                      { key: 'grayscale', label: 'B&W 🌑' },
                      { key: 'sepia', label: 'Vintage 🎞️' },
                    ] as const).map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => {
                          setActiveVideoFilter(filter.key);
                          setShowVideoFiltersMenu(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-left font-semibold transition-colors ${
                          activeVideoFilter === filter.key
                            ? 'bg-brandTeal/20 text-brandTeal'
                            : 'text-gray-400 hover:bg-gray-905 hover:text-white'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Floating Reaction Emojis Overlay */}
                <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                  <AnimatePresence>
                    {callReactions.map((reaction) => (
                      <motion.div
                        key={reaction.id}
                        initial={{ y: '80vh', x: `${30 + Math.random() * 40}%`, scale: 0.5, opacity: 0 }}
                        animate={{
                          y: '10vh',
                          x: `${30 + Math.random() * 40}%`,
                          scale: [0.8, 1.4, 1],
                          opacity: [0, 1, 1, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                        className="absolute text-3xl select-none"
                      >
                        {reaction.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>


      {/* 5. Modals (New Chat, New Group, New Channel, Status Upload) */}
      <AnimatePresence>
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-gray-800 shadow-glass">
              <div className="flex justify-between items-center mb-4">
                <span className="font-extrabold text-lg text-white">Start a New Chat</span>
                <button onClick={() => setShowNewChatModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search user by username or display name..."
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white"
              />

              <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                {userSearchResult.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => startDirectChat(u._id)}
                    className="p-3 bg-gray-950/20 hover:bg-gray-900 rounded-xl flex items-center gap-3 cursor-pointer border border-gray-900"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-gradient flex items-center justify-center text-white font-bold overflow-hidden">
                      {u.profilePhoto ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" /> : 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white block">{u.displayName}</span>
                      <span className="text-xs text-gray-500">@{u.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showNewGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-gray-800 shadow-glass">
              <div className="flex justify-between items-center mb-4">
                <span className="font-extrabold text-lg text-white">Create a Group Chat</span>
                <button onClick={() => setShowNewGroupModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-2">Group Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Development Team"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-2">Search & Add Members</label>
                  <input
                    type="text"
                    placeholder="Search user..."
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white mb-2"
                  />
                  <div className="max-h-36 overflow-y-auto space-y-1.5 border border-gray-900 p-2 rounded-xl">
                    {userSearchResult.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => {
                          if (!groupMembers.includes(u._id)) {
                            setGroupMembers([...groupMembers, u._id]);
                          }
                        }}
                        className="p-2 bg-gray-950/20 hover:bg-gray-900 rounded-lg flex items-center justify-between cursor-pointer"
                      >
                        <span className="text-xs font-bold text-white">{u.displayName} (@{u.username})</span>
                        {groupMembers.includes(u._id) && <Check className="w-4 h-4 text-brandTeal" />}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateGroup}
                  className="w-full py-3 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold transition-all text-sm"
                >
                  Create Group
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-gray-800 shadow-glass">
            <h3 className="text-lg font-bold text-white mb-2">🕒 Schedule Message</h3>
            <p className="text-gray-400 text-xs mb-4">
              Select a date and time in the future to automatically send this message.
            </p>
            <input
              type="datetime-local"
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white mb-4"
              min={new Date().toISOString().slice(0, 16)}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setScheduledTime(null);
                  setShowScheduleModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 text-gray-400 text-sm font-bold"
              >
                Clear
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl bg-brandTeal text-white text-sm font-bold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Upload Modal */}
      {showStoryUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full rounded-3xl border border-gray-800 shadow-glass overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-900 flex justify-between items-center bg-gray-950/60">
              <span className="font-extrabold text-lg text-white">Create Status Update</span>
              <button
                onClick={() => {
                  setShowStoryUploadModal(false);
                  setSelectedStoryFile(null);
                  setSelectedSong(null);
                }}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-obsidian">
              {/* Type Selectors */}
              <div className="flex gap-2">
                {(['text', 'image', 'video', 'audio'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setStoryUploadMediaType(type);
                      setSelectedStoryFile(null);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                      storyUploadMediaType === type
                        ? 'bg-brandTeal text-white'
                        : 'bg-gray-900 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Composition Workspace */}
              {storyUploadMediaType === 'text' && (
                <div className="space-y-4">
                  <div
                    className="h-48 rounded-2xl p-6 flex items-center justify-center relative border border-gray-800"
                    style={{ backgroundColor: storyBackground }}
                  >
                    <textarea
                      value={storyCaption}
                      onChange={(e) => setStoryCaption(e.target.value)}
                      placeholder="Type a status update..."
                      maxLength={150}
                      className="w-full bg-transparent border-none text-white text-center font-extrabold text-lg focus:outline-none resize-none placeholder-white/50"
                    />
                  </div>
                  {/* Preset Backgrounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-semibold mr-2">Color:</span>
                    {['#00B69B', '#6A5ACD', '#FF6347', '#FF1493', '#4169E1', '#FF8C00', '#2E8B57'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setStoryBackground(color)}
                        className={`w-6 h-6 rounded-full border ${
                          storyBackground === color ? 'border-white scale-110 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {storyUploadMediaType !== 'text' && (
                <div className="space-y-4">
                  {!selectedStoryFile ? (
                    <div className="border-2 border-dashed border-gray-800 rounded-2xl h-48 flex flex-col items-center justify-center p-6 text-center hover:border-brandTeal/40 transition-colors">
                      <input
                        type="file"
                        accept={
                          storyUploadMediaType === 'image'
                            ? 'image/*'
                            : storyUploadMediaType === 'video'
                            ? 'video/*'
                            : 'audio/*'
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (storyUploadMediaType === 'image') {
                              setImageToEdit(URL.createObjectURL(file));
                              setShowImageEditorModal(true);
                            } else {
                              setSelectedStoryFile(file);
                            }
                          }
                        }}
                        className="hidden"
                        id="story-file-uploader"
                      />
                      <label htmlFor="story-file-uploader" className="cursor-pointer flex flex-col items-center gap-2">
                        <Paperclip className="w-8 h-8 text-gray-500" />
                        <span className="text-sm font-bold text-white">Choose {storyUploadMediaType}</span>
                        <span className="text-xs text-gray-500">Max size 50MB</span>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {storyUploadMediaType === 'image' && (
                          <img
                            src={URL.createObjectURL(selectedStoryFile)}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-white truncate">{selectedStoryFile.name}</span>
                          <span className="block text-[10px] text-gray-500">
                            {(selectedStoryFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {storyUploadMediaType === 'image' && (
                          <button
                            type="button"
                            onClick={() => {
                              setImageToEdit(URL.createObjectURL(selectedStoryFile));
                              setShowImageEditorModal(true);
                            }}
                            className="p-2 rounded-xl bg-gray-950 text-brandTeal hover:bg-gray-900"
                            title="Crop / Edit"
                          >
                            <Crop className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedStoryFile(null)}
                          className="p-2 rounded-xl bg-gray-950 text-red-500 hover:bg-red-955"
                          title="Remove File"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Caption Input */}
                  <div>
                    <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Caption</label>
                    <input
                      type="text"
                      placeholder="Add a caption..."
                      value={storyCaption}
                      onChange={(e) => setStoryCaption(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-brandTeal focus:outline-none text-sm text-white"
                    />
                  </div>
                </div>
              )}

              {/* Playback Duration Option */}
              <div className="border-t border-gray-900 pt-6">
                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Status Playback Duration</span>
                <div className="flex gap-2">
                  {[
                    { label: '10s', value: 10 },
                    { label: '30s', value: 30 },
                    { label: '1min', value: 60 }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStoryUploadDuration(option.value)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        storyUploadDuration === option.value
                          ? 'bg-brandTeal/20 border-brandTeal text-brandTeal'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Music Option */}
              <div className="border-t border-gray-900 pt-6">
                <span className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Background Music (Spotify Search)</span>
                {!selectedSong ? (
                  <button
                    type="button"
                    onClick={() => setShowMusicSearch(true)}
                    className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-gray-850 text-brandTeal font-bold text-xs flex items-center justify-center gap-2 border border-gray-800/60"
                  >
                    <Music className="w-4 h-4" /> Add Song from Spotify
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3.5 bg-gray-900/40 border border-gray-850 rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={selectedSong.albumArt} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-800 shadow" />
                      <div className="min-w-0">
                        <span className="block text-xs font-extrabold text-white truncate">{selectedSong.title}</span>
                        <span className="block text-[10px] text-gray-400 truncate">{selectedSong.artist}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (playingPreviewTrack === selectedSong.previewUrl) {
                            setPlayingPreviewTrack(null);
                          } else {
                            setPlayingPreviewTrack(selectedSong.previewUrl);
                          }
                        }}
                        className="p-2 rounded-xl bg-gray-955 text-white"
                      >
                        {playingPreviewTrack === selectedSong.previewUrl ? 'Pause' : 'Play'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSong(null)}
                        className="p-2 rounded-xl bg-gray-955 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-900 bg-gray-955 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStoryUploadModal(false);
                  setSelectedStoryFile(null);
                  setSelectedSong(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-xs font-bold text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadStory}
                className="px-5 py-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white transition-all shadow-lg"
              >
                Share Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      {showMusicSearch && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="font-extrabold text-sm text-white">Search Spotify Tracks</span>
              <button
                onClick={() => {
                  setShowMusicSearch(false);
                  setMusicSearchResults([]);
                  setMusicSearchQuery('');
                  setPlayingPreviewTrack(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search songs or artists..."
              value={musicSearchQuery}
              onChange={(e) => handleSearchMusic(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white"
            />

            <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {isSearchingMusic ? (
                <div className="text-center text-xs text-gray-500 py-6">Searching track metadata...</div>
              ) : musicSearchResults.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6">
                  {musicSearchQuery ? 'No tracks found.' : 'Search for background music.'}
                </div>
              ) : (
                musicSearchResults.map((track, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-gray-950/20 border border-gray-900 hover:bg-gray-900 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div
                      onClick={() => {
                        setSelectedSong(track);
                        setShowMusicSearch(false);
                        setMusicSearchResults([]);
                        setMusicSearchQuery('');
                        setPlayingPreviewTrack(null);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <img src={track.albumArt} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <span className="block font-bold text-xs text-white truncate">{track.title}</span>
                        <span className="block text-[9px] text-gray-500 truncate">{track.artist}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (playingPreviewTrack === track.previewUrl) {
                          setPlayingPreviewTrack(null);
                        } else {
                          setPlayingPreviewTrack(track.previewUrl);
                        }
                      }}
                      className="p-1 rounded bg-gray-900 hover:bg-gray-850 text-white text-[9px] font-bold"
                    >
                      {playingPreviewTrack === track.previewUrl ? 'Pause' : 'Preview'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {showImageEditorModal && imageToEdit && (
        <div className={`fixed inset-0 bg-black/95 z-[60] flex p-6 gap-6 justify-center items-center ${
          isMobileView ? 'flex-col overflow-y-auto' : 'flex-row'
        }`}>
          {/* Left panel: Preview canvas */}
          <div className="relative flex-1 max-w-xl aspect-square bg-gray-950 border border-gray-850 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl p-4">
            <div className="relative max-w-full max-h-full">
              <img
                src={imageToEdit}
                alt=""
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blurVal}px)`,
                  transform: `rotate(${rotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block'
                }}
              />
              {/* Crop box overlay */}
              <div
                className="absolute border-2 border-brandTeal border-dashed pointer-events-none bg-brandTeal/5 flex items-center justify-center"
                style={{
                  left: `${cropX}%`,
                  top: `${cropY}%`,
                  width: `${cropW}%`,
                  height: `${cropH}%`
                }}
              >
                <span className="text-[10px] text-brandTeal font-bold bg-gray-955 px-2 py-0.5 rounded border border-brandTeal/30">CROP AREA</span>
              </div>
            </div>
          </div>

          {/* Right panel: Editor controls */}
          <div className={`bg-gray-900/60 glass-card border border-gray-800 p-6 rounded-3xl shadow-glass flex flex-col gap-6 text-white max-h-full overflow-y-auto custom-scrollbar select-none ${
            isMobileView ? 'w-full' : 'w-80'
          }`}>
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="font-extrabold text-sm flex items-center gap-1.5"><Sliders className="w-4 h-4 text-brandTeal" /> Image Editor</span>
              <button
                onClick={() => {
                  setShowImageEditorModal(false);
                  setImageToEdit(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rotation */}
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Rotate</span>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="w-full py-2.5 rounded-xl bg-gray-955 hover:bg-gray-900 border border-gray-850/80 text-xs font-bold text-white flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
              </button>
            </div>

            {/* Crop Sliders */}
            <div className="space-y-4 border-t border-gray-850/60 pt-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Cropping bounds (%)</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>X Offset</span>
                    <span>{cropX}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={100 - cropW}
                    value={cropX}
                    onChange={(e) => setCropX(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Y Offset</span>
                    <span>{cropY}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={100 - cropH}
                    value={cropY}
                    onChange={(e) => setCropY(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Width</span>
                    <span>{cropW}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={100 - cropX}
                    value={cropW}
                    onChange={(e) => setCropW(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Height</span>
                    <span>{cropH}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={100 - cropY}
                    value={cropH}
                    onChange={(e) => setCropH(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
              </div>
            </div>

            {/* Adjustments Filter Sliders */}
            <div className="space-y-4 border-t border-gray-850/60 pt-4">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Adjustments</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Grayscale</span>
                    <span>{grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={grayscale}
                    onChange={(e) => setGrayscale(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Sepia</span>
                    <span>{sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sepia}
                    onChange={(e) => setSepia(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-gray-400 mb-1">
                    <span>Blur</span>
                    <span>{blurVal}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={blurVal}
                    onChange={(e) => setBlurVal(Number(e.target.value))}
                    className="w-full accent-brandTeal"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-auto flex gap-3 border-t border-gray-850/60 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImageEditorModal(false);
                  setImageToEdit(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-955 text-xs font-bold hover:bg-gray-900 border border-gray-850"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedImage}
                className="flex-1 py-2.5 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white shadow-lg"
              >
                Save Edits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryGroup && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center select-none">
          {/* Narrow Phone Screen container */}
          <div className={`w-full max-w-md bg-gray-950 flex flex-col relative rounded-3xl overflow-hidden shadow-2xl border border-gray-900 ${
            isMobileView ? 'h-full' : 'h-[90vh]'
          }`}>
            {/* Top Indicator bars */}
            <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5">
              {activeStoryGroup.stories.map((story, i) => {
                let progress = 0;
                if (i < activeStoryIndex) progress = 100;
                if (i === activeStoryIndex) {
                  const duration = story.duration || (story.mediaType === 'audio' || story.mediaType === 'video' ? 15 : 5);
                  progress = ((duration - storyViewerRemainingSeconds) / duration) * 100;
                }
                return (
                  <div key={story._id} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brandTeal transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Top Creator Info Bar */}
            <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-brandTeal flex items-center justify-center font-bold text-xs text-white">
                  <img
                    src={getFileUrl(activeStoryGroup.user.profilePhoto, activeStoryGroup.user.displayName || activeStoryGroup.user.username)}
                    onError={(e) => { (e.target as HTMLImageElement).src = getRandomAvatar(activeStoryGroup.user.displayName || activeStoryGroup.user.username); }}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="block font-bold text-xs text-white leading-none mb-0.5">
                    {activeStoryGroup.user.displayName}
                  </span>
                  <span className="block text-[8px] text-white/50 leading-none">
                    {new Date(activeStoryGroup.stories[activeStoryIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {activeStoryGroup.stories[activeStoryIndex].songPreviewUrl && (
                  <button
                    onClick={() => setIsMutedStory(!isMutedStory)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/10"
                    title={isMutedStory ? 'Unmute Song' : 'Mute Song'}
                  >
                    {isMutedStory ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveStoryGroup(null);
                    setActiveStoryIndex(0);
                  }}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white border border-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Click/Tap Navigation Areas */}
            <div className="absolute inset-y-16 left-0 w-[20%] z-20 cursor-pointer" onClick={handlePrevStory} />
            <div className="absolute inset-y-16 right-0 w-[20%] z-20 cursor-pointer" onClick={handleNextStory} />

            {/* Core Story Media */}
            <div className="flex-1 flex items-center justify-center p-3 relative bg-black">
              {(() => {
                const story = activeStoryGroup.stories[activeStoryIndex];
                if (story.mediaType === 'text') {
                  return (
                    <div
                      className="absolute inset-0 flex items-center justify-center p-8 text-center text-white font-extrabold text-xl leading-relaxed"
                      style={{ backgroundColor: story.background }}
                    >
                      {story.textContent}
                    </div>
                  );
                } else if (story.mediaType === 'image') {
                  return (
                    <img
                      src={getFileUrl(story.mediaUrl)}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  );
                } else if (story.mediaType === 'video') {
                  return (
                    <video
                      src={getFileUrl(story.mediaUrl)}
                      autoPlay
                      className="max-w-full max-h-full object-contain"
                      ref={storyMediaRef as any}
                    />
                  );
                } else if (story.mediaType === 'audio') {
                  return (
                    <div className="absolute inset-0 bg-gradient-to-tr from-brandViolet/80 to-brandTeal/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                      <div className="w-20 h-20 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white animate-pulse">
                        <Mic className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-extrabold">Audio Status Note</span>
                      <audio
                        src={getFileUrl(story.mediaUrl)}
                        autoPlay
                        ref={storyMediaRef as any}
                        className="w-full mt-4 filter invert"
                        controls
                      />
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Bottom Caption & Song Badge */}
            {(() => {
              const story = activeStoryGroup.stories[activeStoryIndex];
              return (
                <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-30 space-y-3">
                  {story.caption && (
                    <p className="text-center text-xs text-white/90 drop-shadow font-medium leading-relaxed">
                      {story.caption}
                    </p>
                  )}
                  {story.songPreviewUrl && (
                    <div className="flex items-center gap-3 p-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 w-fit mx-auto max-w-[90%] shadow-lg">
                      <div className="w-9 h-9 rounded-xl overflow-hidden relative shadow flex-shrink-0 bg-brandTeal/20">
                        <img
                          src={story.songAlbumArt}
                          alt=""
                          className={`w-full h-full object-cover ${!isMutedStory ? 'animate-spin [animation-duration:10s]' : ''}`}
                        />
                      </div>
                      <div className="min-w-0 pr-1 flex-1">
                        <div className="flex items-center gap-1">
                          <Music className="w-3 h-3 text-brandTeal flex-shrink-0 animate-bounce" />
                          <span className="block text-[10px] font-extrabold text-white truncate leading-none">{story.songTitle}</span>
                        </div>
                        <span className="block text-[8px] text-white/60 truncate mt-0.5 leading-none">{story.songArtist}</span>
                      </div>
                      {/* Background audio player for song preview */}
                      <audio
                        src={story.songPreviewUrl}
                        autoPlay
                        loop
                        muted={isMutedStory}
                        ref={storyAudioRef}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Share Contact Modal */}
      {showShareContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-extrabold text-sm text-white">Share Contact Details</span>
              <button
                onClick={() => setShowShareContactModal(false)}
                className="p-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {friends.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6">No contacts found to share.</div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend._id}
                    onClick={async () => {
                      try {
                        const content = `👤 ${friend.displayName} - @${friend.username} (${friend.email})`;
                        const res = await api.post('/messages/send', {
                          conversationId: activeConversation?._id,
                          content,
                          type: 'contact',
                        });
                        dispatch(addMessage(res.data.message));
                        setShowShareContactModal(false);
                      } catch (err) {
                        console.error(err);
                        alert('Failed to share contact.');
                      }
                    }}
                    className="p-2.5 hover:bg-gray-900 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-brandTeal/10 flex items-center justify-center">
                      <img src={getFileUrl(friend.profilePhoto)} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-bold text-xs text-white truncate">{friend.displayName}</span>
                      <span className="block text-[9px] text-gray-500 truncate">@{friend.username}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio previews playback container */}
      {playingPreviewTrack && (
        <audio src={playingPreviewTrack} autoPlay onEnded={() => setPlayingPreviewTrack(null)} />
      )}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brandTeal/10 text-brandTeal">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-white block">Download VChats App</span>
                  <span className="text-[10px] text-gray-500 block">Get the native application experience on all systems</span>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PC / Laptop */}
              <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-900/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-5 h-5 text-brandTeal" />
                    <span className="font-extrabold text-sm text-white">Computers (Windows, Mac, Linux)</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Install VChats as a native desktop application with support for taskbar docking, auto-start, and system notifications.
                  </p>
                </div>
                <div className="pt-2">
                  {deferredPrompt ? (
                    <button
                      onClick={() => {
                        handleInstallApp();
                        setShowDownloadModal(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold text-xs shadow-lg hover:shadow-brandTeal/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Install Desktop App
                    </button>
                  ) : (
                    <div className="space-y-2 text-center p-3 bg-gray-950/40 border border-gray-900/60 rounded-xl">
                      <span className="text-[10px] font-bold text-brandTeal block">Browser-based Installation</span>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        To download on PC, click the **Install icon** `⊕` or **Install VChats** option in your browser's address bar.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Devices */}
              <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-900/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-brandViolet" />
                    <span className="font-extrabold text-sm text-white">Smartphones (Android & iOS)</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Install VChats directly onto your mobile home screen to receive real-time call notifications and view the layout perfectly as a full-screen app.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  {deferredPrompt ? (
                    <button
                      onClick={() => {
                        handleInstallApp();
                        setShowDownloadModal(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brandViolet hover:bg-brandViolet-dark text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Install Android App
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-950/40 border border-gray-900/60 rounded-xl text-left space-y-1">
                        <span className="text-[10px] font-bold text-pink-400 block">Apple iOS (Safari)</span>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          1. Open this website in Safari.<br />
                          2. Tap the **Share** button (box with an up arrow) at the bottom.<br />
                          3. Select **Add to Home Screen** from the list.<br />
                          4. Tap **Add** in the top right to download.
                        </p>
                      </div>
                      <div className="p-2.5 bg-gray-950/40 border border-gray-900/60 rounded-xl text-left space-y-1">
                        <span className="text-[10px] font-bold text-brandTeal block">Android (Chrome)</span>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          Tap the **three dots menu** at the top right of Chrome, and select **Add to Home screen** or **Install app**.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroupModal && activeConversation && activeConversation.type === 'group' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-extrabold text-sm text-white">Edit Group Details</span>
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setSelectedGroupAvatarFile(null);
                }}
                className="p-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">Group Avatar</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-850 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                    {selectedGroupAvatarFile ? (
                      <img src={URL.createObjectURL(selectedGroupAvatarFile)} className="w-full h-full object-cover" />
                    ) : activeConversation.groupId?.avatar ? (
                      <img src={getFileUrl(activeConversation.groupId.avatar)} className="w-full h-full object-cover" />
                    ) : (
                      activeConversation.groupId?.name.charAt(0)
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedGroupAvatarFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="edit-group-avatar-uploader"
                  />
                  <label
                    htmlFor="edit-group-avatar-uploader"
                    className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 text-xs font-bold text-white cursor-pointer border border-gray-805"
                  >
                    Change Photo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Group Name</label>
                <input
                  type="text"
                  placeholder="Group Name"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  placeholder="Group Description"
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-955 border border-gray-800 focus:border-brandTeal focus:outline-none text-xs text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowEditGroupModal(false);
                  setSelectedGroupAvatarFile(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-905 hover:bg-gray-850 text-xs font-bold text-white border border-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateGroupDetails}
                className="px-4 py-2 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp-style Delete Message Dialog */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1f2c34] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200 select-none text-white">
            <h3 className="text-base font-extrabold mb-4">Delete message?</h3>
            
            <div className="flex flex-col gap-2.5">
              {/* Option 1: Delete for everyone (only if current user is the sender) */}
              {((messageToDelete.senderId._id || messageToDelete.senderId) === currentUserId) && (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteMessage(messageToDelete._id, 'everyone');
                    setMessageToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 text-brandTeal font-bold text-xs text-left transition-colors"
                >
                  Delete for everyone
                </button>
              )}

              {/* Option 2: Delete for me */}
              <button
                type="button"
                onClick={() => {
                  handleDeleteMessage(messageToDelete._id, 'me');
                  setMessageToDelete(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 text-brandTeal font-bold text-xs text-left transition-colors"
              >
                Delete for me
              </button>

              {/* Option 3: Cancel */}
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-gray-900/40 text-gray-400 hover:text-white font-bold text-xs text-left transition-colors mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Wallpaper Crop & Adjust Modal */}
      {showCropModal && cropImageSrc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-6">
            
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <span className="font-extrabold text-sm text-white">Adjust & Crop Wallpaper</span>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }}
                className="p-1 rounded-lg bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Real-time interactive preview */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Live Chat Preview</span>
                <div className="w-full h-80 rounded-2xl relative overflow-hidden bg-gray-950 border border-gray-800 flex flex-col justify-end p-4 gap-2">
                  
                  {/* Live Adjusted Wallpaper image */}
                  <div
                    className="absolute inset-0 transition-all duration-75 pointer-events-none"
                    style={{
                      backgroundImage: `url(${cropImageSrc})`,
                      backgroundSize: 'cover',
                      backgroundPosition: `${50 + cropPosX}% ${50 + cropPosY}%`,
                      filter: `blur(${cropBlur}px)`,
                      transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`,
                      opacity: 0.9,
                    }}
                  />
                  
                  {/* Mock message bubbles to test contrast */}
                  <div className="z-10 bg-obsidian border border-gray-800 p-2.5 rounded-2xl text-[10px] text-gray-300 self-start max-w-[85%] shadow-md">
                    How does the wallpaper contrast look with bubbles? 💬
                  </div>
                  <div className="z-10 bg-brandViolet text-white p-2.5 rounded-2xl text-[10px] self-end max-w-[85%] shadow-md">
                    Contrast looks perfect! Super legible! 🔥
                  </div>
                </div>
              </div>

              {/* Right Column: Adjustments Controls */}
              <div className="space-y-4 flex flex-col justify-center">
                
                {/* Zoom Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>ZOOM / SCALE</span>
                    <span className="text-brandTeal">{cropZoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brandTeal"
                  />
                </div>

                {/* X Position Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>POSITION X</span>
                    <span className="text-brandTeal">{cropPosX > 0 ? `+${cropPosX}` : cropPosX}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropPosX}
                    onChange={(e) => setCropPosX(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brandTeal"
                  />
                </div>

                {/* Y Position Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>POSITION Y</span>
                    <span className="text-brandTeal">{cropPosY > 0 ? `+${cropPosY}` : cropPosY}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropPosY}
                    onChange={(e) => setCropPosY(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brandTeal"
                  />
                </div>

                {/* Blur Control */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>BLUR AMOUNT</span>
                    <span className="text-brandTeal">{cropBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={cropBlur}
                    onChange={(e) => setCropBlur(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brandTeal"
                  />
                </div>

                {/* Rotation Control */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400">ROTATION</span>
                  <div className="flex gap-2">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => setCropRotation(deg)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                          cropRotation === deg
                            ? 'bg-brandTeal border-brandTeal text-white'
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setCropImageSrc(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-xs font-bold text-white border border-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCroppedTheme}
                className="px-5 py-2 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
              >
                Apply Theme
              </button>
            </div>

          </div>
        </div>
      )}
      {/* 🔒 SECURITY LOCK PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-80 bg-gray-950/90 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            
            {pinModalMode === 'verify' ? (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={biometricUnlockStatus === 'scanning' || biometricUnlockStatus === 'success'}
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all hover:scale-110 active:scale-95 border ${
                  biometricUnlockStatus === 'scanning' ? 'bg-brandTeal/10 border-brandTeal/40 animate-pulse text-brandTeal' :
                  biometricUnlockStatus === 'success' ? 'bg-green-500/10 border-green-500/40 text-green-400' :
                  biometricUnlockStatus === 'failed' ? 'bg-red-500/10 border-red-500/40 text-red-400' :
                  'bg-brandTeal/10 hover:bg-brandTeal/20 border-brandTeal/30 text-brandTeal shadow-[0_0_15px_rgba(0,182,155,0.2)]'
                }`}
                title="Unlock with Fingerprint"
              >
                <Fingerprint className={`w-7 h-7 ${biometricUnlockStatus === 'scanning' ? 'animate-bounce' : ''}`} />
              </button>
            ) : (
              <div className="w-12 h-12 bg-teal-gradient/20 border border-brandTeal/30 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-xl">🔒</span>
              </div>
            )}
            
            <h3 className="font-extrabold text-sm text-white mb-1">
              {biometricUnlockStatus === 'scanning' && 'Scanning Fingerprint...'}
              {biometricUnlockStatus === 'success' && 'Biometric Verified!'}
              {biometricUnlockStatus === 'failed' && 'Verification Failed'}
              {biometricUnlockStatus === 'idle' && (
                <>
                  {pinModalMode === 'setup' && 'Setup Secure PIN'}
                  {pinModalMode === 'confirm' && 'Confirm Secure PIN'}
                  {pinModalMode === 'verify' && 'Chats Secured'}
                </>
              )}
            </h3>
            
            <p className="text-[10px] text-gray-500 text-center mb-6 max-w-[200px]">
              {biometricUnlockStatus === 'scanning' && 'Place your registered finger on the fingerprint scanner.'}
              {biometricUnlockStatus === 'success' && 'Unlocking your private chats.'}
              {biometricUnlockStatus === 'failed' && 'Unable to verify biometric data. Try again.'}
              {biometricUnlockStatus === 'idle' && (
                <>
                  {pinModalMode === 'setup' && 'Enter a 4-digit code to lock private chats'}
                  {pinModalMode === 'confirm' && 'Re-enter your 4-digit code to confirm'}
                  {pinModalMode === 'verify' && 'Provide your 4-digit security PIN or scan fingerprint to unlock'}
                </>
              )}
            </p>

            <div className="flex gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                    pinInput.length > idx
                      ? 'bg-brandTeal border-brandTeal scale-110 shadow-[0_0_10px_rgba(0,182,155,0.4)]'
                      : 'bg-transparent border-gray-700'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-[220px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeypadPress(num)}
                  className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-900 border border-gray-850 hover:border-gray-800 text-sm font-extrabold text-white flex items-center justify-center transition-all select-none active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="w-12 h-12 rounded-full text-xs font-bold text-gray-400 hover:text-white flex items-center justify-center active:scale-95"
              >
                Del
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="w-12 h-12 rounded-full bg-gray-900/60 hover:bg-gray-900 border border-gray-850 hover:border-gray-800 text-sm font-extrabold text-white flex items-center justify-center transition-all select-none active:scale-95"
              >
                0
              </button>

              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 4}
                className={`w-12 h-12 rounded-full text-xs font-extrabold flex items-center justify-center transition-all active:scale-95 ${
                  pinInput.length === 4
                    ? 'bg-brandTeal text-white'
                    : 'text-gray-655 cursor-not-allowed'
                }`}
              >
                OK
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPinModal(false);
                setTargetLockConv(null);
              }}
              className="mt-6 text-[10px] font-bold text-gray-500 hover:text-white transition-colors"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

      {/* WhatsApp-style Disappearing Messages Modal */}
      {showDisappearingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1f2c34] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Clock className="w-5 h-5 text-pink-400" /> Disappearing messages
              </h3>
              <button onClick={() => setShowDisappearingModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Make new messages in this chat disappear. Existing messages won't be affected.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Off', value: 0 },
                { label: '24 hours', value: 86400 },
                { label: '7 days', value: 604800 },
                { label: '90 days', value: 7776000 },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-gray-800 hover:bg-gray-850 cursor-pointer transition-colors"
                >
                  <span className="text-xs font-bold text-gray-200">{opt.label}</span>
                  <input
                    type="radio"
                    name="disappearing-duration"
                    checked={selectedDisappearingDuration === opt.value}
                    onChange={() => setSelectedDisappearingDuration(opt.value)}
                    className="w-4 h-4 text-brandTeal bg-gray-900 border-gray-800 focus:ring-brandTeal cursor-pointer"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...disappearingDurations,
                    [activeConversation?._id || '']: selectedDisappearingDuration,
                  };
                  setDisappearingDurations(updated);
                  localStorage.setItem('vchats_disappearing_durations', JSON.stringify(updated));
                  setShowDisappearingModal(false);
                  alert(`Disappearing messages set to: ${selectedDisappearingDuration === 0 ? 'Off' : selectedDisappearingDuration / 86400 + ' days'}`);
                }}
                className="flex-1 py-2 bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white rounded-xl transition-all"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowDisappearingModal(false)}
                className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-style Custom List Modal */}
      {showAddToListModal && activeConversation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1f2c34] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-450" /> Add chat to list
              </h3>
              <button onClick={() => setShowAddToListModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Add this conversation to custom lists to organize your inbox filters.
            </p>
            
            {/* Create new list input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New list name (e.g. Work)"
                value={newListNameInput}
                onChange={(e) => setNewListNameInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brandTeal"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newListNameInput.trim();
                  if (!trimmed) return;
                  if (customLists[trimmed]) {
                    alert("List already exists.");
                    return;
                  }
                  handleSaveCustomList(trimmed, activeConversation._id, 'add');
                  setNewListNameInput('');
                }}
                className="px-3 py-1.5 bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {Object.keys(customLists).length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6">No custom lists created yet.</div>
              ) : (
                Object.keys(customLists).map((listName) => {
                  const isInList = customLists[listName]?.includes(activeConversation._id);
                  return (
                    <div
                      key={listName}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/40 border border-gray-850 hover:bg-gray-900 transition-colors"
                    >
                      <span className="text-xs font-bold text-gray-300">{listName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleSaveCustomList(listName, activeConversation._id, isInList ? 'remove' : 'add');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                          isInList
                            ? 'bg-red-650/20 text-red-400 hover:bg-red-650 hover:text-white'
                            : 'bg-brandTeal/20 text-brandTeal hover:bg-brandTeal hover:text-white'
                        }`}
                      >
                        {isInList ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddToListModal(false)}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-style Schedule Call Modal */}
      {showScheduleCallModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1f2c34] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-450" /> Schedule call
              </h3>
              <button onClick={() => setShowScheduleCallModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Call Type</label>
                <div className="flex gap-2">
                  {(['video', 'voice'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScheduledCallType(type)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        scheduledCallType === type
                          ? 'bg-brandTeal text-white border-brandTeal shadow-md'
                          : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-850'
                      }`}
                    >
                      {type} Call
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Date</label>
                <input
                  type="date"
                  value={scheduledCallDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduledCallDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none focus:border-brandTeal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Time</label>
                <input
                  type="time"
                  value={scheduledCallTime}
                  onChange={(e) => setScheduledCallTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none focus:border-brandTeal"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreateScheduledCall}
                className="flex-1 py-2 bg-brandTeal hover:bg-brandTeal-dark text-xs font-bold text-white rounded-xl transition-all"
              >
                Schedule Call
              </button>
              <button
                type="button"
                onClick={() => setShowScheduleCallModal(false)}
                className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-style Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1f2c34] border border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Report conversation
              </h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Let us know why you are reporting this conversation. The last few messages will be forwarded to our moderation team.
            </p>

            <textarea
              placeholder="Please enter a reason for reporting (e.g. spam, harassment, inappropriate content)..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brandTeal resize-none"
            />

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleReportEntity}
                className="flex-1 py-2 bg-red-650 hover:bg-red-750 text-xs font-bold text-white rounded-xl transition-all"
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

  if (layoutMode === 'mockup') {
    return (
      <div className="min-h-screen w-screen bg-[#05070a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/20 via-gray-950 to-gray-950 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="mb-4 flex items-center gap-3 bg-gray-900/60 p-2 px-4 rounded-full border border-gray-800 backdrop-blur-md select-none">
          <span className="text-xs text-gray-400 font-bold">VChats Mobile Preview</span>
          <button
            onClick={() => {
              setLayoutMode('responsive');
              localStorage.setItem('vchats_layout_mode', 'responsive');
            }}
            className="text-[10px] px-2.5 py-1 rounded-full bg-gray-850 hover:bg-gray-700 text-gray-300 transition-all font-bold"
          >
            Exit Mockup
          </button>
        </div>

        <div className="relative w-[380px] h-[820px] bg-obsidian rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-[12px] border-gray-800 ring-4 ring-gray-900/40 overflow-hidden flex flex-col">
          <div className="absolute top-3.5 left-1/2 transform -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 absolute right-3" />
          </div>
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-700/50 rounded-full z-50" />
          <div className="flex-1 w-full h-full overflow-hidden relative bg-obsidian">
            {innerContent}
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full z-50" />
        </div>
      </div>
    );
  }

  return innerContent;
};

export default ChatDashboard;
