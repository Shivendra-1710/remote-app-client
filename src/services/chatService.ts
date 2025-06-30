import { io, Socket } from 'socket.io-client';
import { Message } from '../types/chat';

class ChatService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  constructor() {
    this.socket = io('http://localhost:3000', {
      autoConnect: false,
      withCredentials: true
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    this.socket.on('auth_success', () => {
      console.log('Successfully authenticated with chat server');
    });

    this.socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
    });
  }

  public connect(userId: string) {
    if (!this.socket) return;
    
    this.userId = userId;
    this.socket.connect();
    this.socket.emit('authenticate', userId);
  }

  public disconnect() {
    if (!this.socket) return;
    
    this.socket.disconnect();
    this.userId = null;
  }

  public sendMessage(receiverId: string, message: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.userId) {
        reject(new Error('Not connected to chat server'));
        return;
      }

      this.socket.emit('private_message', { receiverId, message });

      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 5000);

      this.socket.once('message_sent', (message: Message) => {
        clearTimeout(timeout);
        resolve(message);
      });

      this.socket.once('message_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  public getChatHistory(otherUserId: string): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.userId) {
        reject(new Error('Not connected to chat server'));
        return;
      }

      this.socket.emit('get_chat_history', { otherUserId });

      const timeout = setTimeout(() => {
        reject(new Error('Chat history fetch timeout'));
      }, 5000);

      this.socket.once('chat_history', (messages: Message[]) => {
        clearTimeout(timeout);
        resolve(messages);
      });

      this.socket.once('chat_history_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  public markMessagesAsRead(senderId: string) {
    if (!this.socket || !this.userId) return;
    
    this.socket.emit('mark_messages_read', { senderId });
  }

  public onNewMessage(callback: (message: Message) => void) {
    if (!this.socket) return;
    
    this.socket.on('new_message', callback);
  }

  public onMessagesRead(callback: (data: { by: string }) => void) {
    if (!this.socket) return;
    
    this.socket.on('messages_read', callback);
  }

  public onUserOnline(callback: (data: { userId: string }) => void) {
    if (!this.socket) return;
    
    this.socket.on('user:online', callback);
  }
}

export const chatService = new ChatService(); 