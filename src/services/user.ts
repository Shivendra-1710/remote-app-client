import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { User } from '../types/user';
import { authHeader } from './auth';

export const getUserProfile = async (): Promise<User> => {
  const response = await axios.get(
    `${API_CONFIG.baseURL}/users/profile`,
    { headers: authHeader() }
  );
  return response.data.user || response.data;
};

export const updateUserProfile = async (userData: Partial<User>): Promise<User> => {
  const response = await axios.put(
    `${API_CONFIG.baseURL}/users/profile`,
    userData,
    { headers: authHeader() }
  );
  return response.data.user || response.data;
};

export const updateUserStatus = async (status: string): Promise<User> => {
  const response = await axios.put(
    `${API_CONFIG.baseURL}/users/status`,
    { status },
    { headers: authHeader() }
  );
  return response.data.user || response.data;
};

export const getAllUsers = async (): Promise<User[]> => {
  const response = await axios.get(
    `${API_CONFIG.baseURL}/users`,
    { headers: authHeader() }
  );
  return response.data.users;
}; 