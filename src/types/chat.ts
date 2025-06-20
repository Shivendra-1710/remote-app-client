export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  type?: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  replyTo?: {
    id: string;
    content: string;
    sender: string;
  };
} 