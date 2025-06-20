import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from './auth';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const createUser = async (userData: {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  title?: string;
  location?: string;
  status?: string;
  avatar?: string;
}) => {
  try {
    const response = await api.post('/users/create', userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.error || 'Failed to create user');
    }
    throw error;
  }
}; 