export type UserStatus = 'online' | 'offline' | 'away' | 'busy' | 'in-call' | 'idle' | 'dnd';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  status: UserStatus;
  role?: 'user' | 'admin';
  customStatus?: string;
  activity?: string;
  phone?: string;
  department?: string;
  title?: string;
  location?: string;
  lastActive?: Date;
  lastSeen?: Date;
  isTyping?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  type: 'text' | 'file' | 'image';
  content: string;
  timestamp: Date;
  userName: string;
  userAvatar: string;
}

export interface AdminUser extends User {
  role: 'admin';
  managedDepartments: string[];
}

export interface RegularUser extends User {
  role: 'user';
  supervisor?: string;
  workSchedule?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export const isAdminUser = (user: User): user is AdminUser => {
  return user.role === 'admin';
};

export const isRegularUser = (user: User): user is RegularUser => {
  return user.role === 'user';
}; 