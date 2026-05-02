import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL, API_BASE_PATH } from '@/utils/constants';
import type {
  Audit,
  AuditRequest,
  AuditResponse,
  AuditResults,
  Vulnerability,
  Patch,
} from '@/types/audit.types';
import type { ApiResponse } from '@/types/api.types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}${API_BASE_PATH}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth tokens here if needed
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const message = this.getErrorMessage(error);
        return Promise.reject(new Error(message));
      }
    );
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response) {
      const data = error.response.data as any;
      return data?.message || data?.error || 'An error occurred';
    }
    if (error.request) {
      return 'No response from server. Please check your connection.';
    }
    return error.message || 'An unexpected error occurred';
  }

  // Audit operations
  async startAudit(data: AuditRequest): Promise<AuditResponse> {
    const response = await this.client.post<AuditResponse>('/audit', data);
    return response.data;
  }

  async getAudit(id: string): Promise<Audit> {
    const response = await this.client.get<ApiResponse<Audit>>(`/audit/${id}`);
    return response.data.data!;
  }

  async getVulnerabilities(auditId: string): Promise<Vulnerability[]> {
    const response = await this.client.get<ApiResponse<Vulnerability[]>>(
      `/audit/${auditId}/vulnerabilities`
    );
    return response.data.data || [];
  }

  async getPatches(auditId: string): Promise<Patch[]> {
    const response = await this.client.get<ApiResponse<Patch[]>>(
      `/audit/${auditId}/patches`
    );
    return response.data.data || [];
  }

  async getResults(auditId: string): Promise<AuditResults> {
    const response = await this.client.get<ApiResponse<AuditResults>>(
      `/audit/${auditId}/results`
    );
    return response.data.data!;
  }

  async downloadReport(auditId: string): Promise<Blob> {
    const response = await this.client.get(`/audit/${auditId}/report`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;

// Made with Bob
