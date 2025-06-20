// API Configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  socketURL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
}; 