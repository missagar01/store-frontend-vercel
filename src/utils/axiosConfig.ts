// src/utils/axiosConfig.ts
import axios from 'axios';
import { API_URL, isTokenExpired, handleAuthError } from '@/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor - Add token to headers and check expiration
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Check if token is expired before making request
    if (token && isTokenExpired(token)) {
      console.log('Token expired before request, redirecting to login...');
      handleAuthError();
      return Promise.reject(new Error('Token expired'));
    }
    
    // Add token to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401/403 responses
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized or 403 Forbidden
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        console.log('Unauthorized access detected, redirecting to login...');
        handleAuthError();
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;







