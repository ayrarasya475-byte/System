export interface Prompt {
  id: string;
  name: string;
  content: string;
  modelId: string;
  likes: number;
  copyCount: number;
  downloadCount: number;
  viewCount?: number;
  creatorId: string;
  createdAt: any; // Firestore Timestamp
  status: 'active' | 'pending';
  notes?: string;
  password?: string;
  isLocked?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: any;
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
  senderName: string;
  createdAt: any;
  targetUserId?: string | null;
}

export interface BannedUser {
  id: string; // userId or deviceId
  email?: string;
  reason?: string;
  createdAt: any;
  bannedUntil?: any;
  aiBlocked?: boolean;
  blockedPromptIds?: string[];
}

export interface SystemConfig {
  id: 'main_prompt';
  mode: 'default' | 'change';
  customContent?: string;
  updatedAt: any;
  maintenance?: {
    active: boolean;
    startAt: string;
    endAt: string;
    note?: string;
    autoXerox?: boolean;
  };
}

export interface UserMetadata {
  id: string; // userId
  email: string;
  displayName?: string;
  photoURL?: string;
  ip?: string;
  location?: string;
  dns?: string;
  userAgent?: string;
  lastLogin: any;
  copyStats: number;
  shareStats?: number;
  likeStats?: number;
  commentStats?: number;
  loginCount: number;
  role?: 'user' | 'admin' | 'owner' | 'super_owner';
}

export interface Model {
  id: string;
  name: string;
}

export interface Suggestion {
  id: string;
  userName: string;
  promptName: string;
  status: 'legal' | 'illegal';
  details: string;
  userId: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  chatId: string;
  createdAt: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  userName?: string;
  userEmail: string;
  lastMessage: string;
  updatedAt: any;
  status: 'open' | 'closed';
}

export interface StatsLog {
  id: string;
  promptId: string;
  type: 'copy' | 'download' | 'like' | 'ai';
  userId?: string;
  createdAt: any;
}
