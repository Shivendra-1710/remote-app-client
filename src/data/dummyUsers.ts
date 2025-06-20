import { User, UserStatus, UserRole } from '../types/user';

export const dummyUsers: User[] = [
  {
    id: '1',
    username: 'johndoe',
    name: 'John Doe',
    email: 'john.doe@company.com',
    avatar: 'https://i.pravatar.cc/150?img=1',
    status: 'online' as UserStatus,
    role: 'admin' as UserRole,
    customStatus: 'Working on new features',
    activity: 'In a meeting',
    department: 'Engineering',
    title: 'Senior Software Engineer',
    location: 'San Francisco, CA',
    lastActive: new Date()
  },
  {
    id: '2',
    username: 'janesmith',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    avatar: 'https://i.pravatar.cc/150?img=2',
    status: 'busy' as UserStatus,
    role: 'user' as UserRole,
    department: 'Design',
    title: 'UI/UX Designer',
    location: 'New York, NY',
    lastActive: new Date()
  },
  {
    id: '3',
    username: 'mikejohnson',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
    avatar: 'https://i.pravatar.cc/150?img=3',
    status: 'offline' as UserStatus,
    role: 'user' as UserRole,
    department: 'Marketing',
    title: 'Marketing Manager',
    location: 'Chicago, IL',
    lastActive: new Date()
  },
  {
    id: '4',
    username: 'sarahwilliams',
    name: 'Sarah Williams',
    email: 'sarah.williams@company.com',
    avatar: 'https://i.pravatar.cc/150?img=4',
    status: 'in-call' as UserStatus,
    role: 'user' as UserRole,
    customStatus: 'Client meeting',
    department: 'Sales',
    title: 'Sales Director',
    location: 'Los Angeles, CA',
    lastActive: new Date()
  }
]; 