export interface Prompt {
  id: string;
  name: string;
  content: string;
  modelId: string;
  likes: number;
  copyCount: number;
  downloadCount: number;
  creatorId: string;
  createdAt: any; // Firestore Timestamp
  status: 'active' | 'pending';
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
  userEmail: string;
  lastMessage: string;
  updatedAt: any;
  status: 'open' | 'closed';
}

export interface StatsLog {
  id: string;
  promptId: string;
  type: 'copy' | 'download' | 'like';
  userId?: string;
  createdAt: any;
}
