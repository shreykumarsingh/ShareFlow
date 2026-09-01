import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  AuthResponse,
  LoginForm,
  RegisterForm,
  UploadResponse,
  FilesListResponse,
  ApiError,
  UploadOptions,
} from '../types';

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return process.env.REACT_APP_PROD_API_URL || '';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5001';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): ApiError {
    if (error.response?.data) {
      const data: any = error.response.data;
      if (typeof data === 'string') {
        return { error: data };
      }
      if (data.error) {
        return { error: data.error };
      }
      return data as ApiError;
    }
    return {
      error: error.message || 'An unexpected error occurred',
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  async login(data: LoginForm): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  }

  async register(data: RegisterForm): Promise<AuthResponse> {
    const { confirmPassword, ...registerData } = data;
    const response = await this.api.post<AuthResponse>('/api/auth/register', registerData);
    return response.data;
  }

  async uploadFile(
    file?: File | null,
    options: UploadOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();

    // Text fields MUST be appended BEFORE the file binary stream so Multer populates req.body first
    if (options.text_content) {
      formData.append('text_content', options.text_content);
    }
    if (options.is_public !== undefined) {
      formData.append('is_public', options.is_public.toString());
    }
    if (options.password) {
      formData.append('password', options.password);
    }
    if (options.expires_at) {
      formData.append('expires_at', options.expires_at);
    }
    if (options.user_id) {
      formData.append('user_id', options.user_id);
    }
    if (options.custom_slug) {
      formData.append('custom_slug', options.custom_slug);
    }
    if (options.is_edit_locked !== undefined) {
      formData.append('is_edit_locked', options.is_edit_locked.toString());
    }
    if (options.expires_in_hours) {
      formData.append('expires_in_hours', options.expires_in_hours.toString());
    }

    // Binary file field appended last
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await this.api.post<UploadResponse>('/api/files/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      console.log('✅ Upload: Success!', response.data);

      try {
        const uploadHistory = JSON.parse(localStorage.getItem('recent_uploads') || '[]');
        const newEntry = {
          id: response.data.file.id,
          original_name: response.data.file.original_name || (file ? file.name : 'shared_note.txt'),
          mime_type: response.data.file.mime_type || (file ? file.type : 'text/plain'),
          size_bytes: response.data.file.size_bytes || (file ? file.size : 0),
          size_formatted: response.data.file.size_formatted,
          text_content: response.data.file.text_content,
          created_at: response.data.file.created_at,
          expires_at: response.data.file.expires_at,
          shareable_link: response.data.shareable_link || `${window.location.origin}/download/${response.data.file.custom_slug || response.data.file.id}`
        };
        const filtered = uploadHistory.filter((item: any) => item.id !== newEntry.id);
        filtered.unshift(newEntry);
        if (filtered.length > 20) filtered.pop();
        localStorage.setItem('recent_uploads', JSON.stringify(filtered));
      } catch (e) {
        // Ignore localStorage errors
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Upload: Error!', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Upload failed';
      throw new Error(errorMessage);
    }
  }

  async getFileInfo(fileId: string, password?: string) {
    const url = `/api/files/${fileId}/info`;

    if (password) {
      const response = await this.api.post(url, { password });
      return response.data;
    } else {
      const response = await this.api.get(url);
      return response.data;
    }
  }

  async downloadFile(fileId: string, password?: string): Promise<Blob> {
    const url = `/api/files/${fileId}/download`;

    const config = {
      responseType: 'blob' as const,
    };

    if (password) {
      const response = await this.api.post(url, { password }, config);
      return response.data;
    } else {
      const response = await this.api.get(url, config);
      return response.data;
    }
  }

  getPreviewUrl(fileId: string, password?: string): string {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    return `${API_BASE_URL}/api/files/${fileId}/preview${params}`;
  }

  async getUserFiles(page = 1, limit = 20, userId?: string): Promise<FilesListResponse> {
    const userParam = userId ? `&user_id=${encodeURIComponent(userId)}` : '';
    const response = await this.api.get<FilesListResponse>(`/api/files?page=${page}&limit=${limit}${userParam}`);
    return response.data;
  }

  async deleteFile(fileId: string, userId?: string) {
    const userParam = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    const response = await this.api.delete(`/api/files/${fileId}${userParam}`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
