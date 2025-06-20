export type MessageType = 'text' | 'file' | 'image' | 'system';

export interface Message {
  id: string;
  senderId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: MessageType;
} 