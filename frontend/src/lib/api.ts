import axios from 'axios';
import { User, EmailJob, SenderConfig, DashboardStats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authApi = {
  getGoogleUrl: async () => {
    const res = await api.get('/auth/google/url');
    return res.data;
  },
  googleCallback: async (data: { credential?: string; code?: string; email?: string; name?: string; avatar?: string }) => {
    const res = await api.post('/auth/google/callback', data);
    return res.data;
  },
  demoLogin: async (data?: { email?: string; name?: string }) => {
    const res = await api.post('/auth/demo', data || {});
    return res.data;
  },
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await api.post('/auth/logout');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reachinbox_token');
    }
    return res.data;
  },
};

export const emailApi = {
  scheduleSingle: async (data: {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    scheduledAt: string;
    delayBetweenEmails?: number;
    hourlyLimit?: number;
  }) => {
    const res = await api.post('/emails/schedule', data);
    return res.data;
  },
  scheduleBulk: async (data: {
    senderEmail: string;
    recipientEmails: string[];
    subject: string;
    body: string;
    startTime: string;
    delayBetweenEmails?: number;
    hourlyLimit?: number;
  }) => {
    const res = await api.post('/emails/schedule-bulk', data);
    return res.data;
  },
  uploadCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/emails/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  parseCsvText: async (content: string) => {
    const res = await api.post('/emails/upload-csv', { content });
    return res.data;
  },
  getScheduled: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get('/emails/scheduled', { params });
    return res.data;
  },
  getSent: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get('/emails/sent', { params });
    return res.data;
  },
  cancelEmail: async (id: string) => {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/emails/stats');
    return res.data;
  },
  getSenders: async (): Promise<{ senders: SenderConfig[] }> => {
    const res = await api.get('/emails/senders');
    return res.data;
  },
  createSender: async (data: { email: string; displayName?: string; hourlyLimit?: number }) => {
    const res = await api.post('/emails/senders', data);
    return res.data;
  },
};

export const slackApi = {
  getAuthUrl: async () => {
    const res = await api.get('/slack/auth-url');
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/slack/status');
    return res.data;
  },
  setWebhook: async (data: { webhookUrl: string; channel?: string }) => {
    const res = await api.post('/slack/webhook', data);
    return res.data;
  },
  disconnect: async () => {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },
  testAlert: async (data?: { senderEmail?: string; limit?: number }) => {
    const res = await api.post('/slack/test-alert', data || {});
    return res.data;
  },
};

export const searchApi = {
  search: async (q: string, status?: string) => {
    const res = await api.get('/search', { params: { q, status } });
    return res.data;
  },
};

export default api;
