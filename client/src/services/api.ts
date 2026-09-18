import type {
  ApiResponse,
  InventoryItem,
  WorkCenter,
  BOM,
} from '../types.ts';

// In browser, try relative /api (proxied by Vite) first. Fall back to direct http://localhost:5555/api if needed.
const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err: unknown) {
    // If proxy failed and running in browser, try direct localhost:5555 fallback
    if (url.startsWith('/api') && window.location.hostname === 'localhost') {
      try {
        const fallbackUrl = `http://localhost:5555/api${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok || fallbackData.success === false) {
          throw new Error(fallbackData.message || `Request failed with status ${fallbackRes.status}`);
        }
        return fallbackData;
      } catch (fbErr: unknown) {
        if (fbErr instanceof Error) {
          throw fbErr;
        }
        throw new Error('Network error connecting to MES server.');
      }
    }

    if (err instanceof Error) {
      throw err;
    }
    throw new Error('An unexpected error occurred during API request.');
  }
}

// ----------------------------------------------------
// Inventory API
// ----------------------------------------------------
export const api = {
  // Inventory
  async getInventory(params?: { category?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<InventoryItem[]>>(`/inventory${qs}`);
  },

  async getInventoryItem(id: string) {
    return request<ApiResponse<InventoryItem>>(`/inventory/${id}`);
  },

  async createInventoryItem(item: Partial<InventoryItem>) {
    return request<ApiResponse<InventoryItem>>('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateInventoryItem(id: string, item: Partial<InventoryItem>) {
    return request<ApiResponse<InventoryItem>>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  async deleteInventoryItem(id: string) {
    return request<ApiResponse<InventoryItem>>(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },

  // Work Centers
  async getWorkCenters(params?: { status?: string; type?: string; department?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.department) query.append('department', params.department);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<WorkCenter[]>>(`/work-centers${qs}`);
  },

  async getWorkCenter(id: string) {
    return request<ApiResponse<WorkCenter>>(`/work-centers/${id}`);
  },

  async createWorkCenter(wc: Partial<WorkCenter>) {
    return request<ApiResponse<WorkCenter>>('/work-centers', {
      method: 'POST',
      body: JSON.stringify(wc),
    });
  },

  async updateWorkCenter(id: string, wc: Partial<WorkCenter>) {
    return request<ApiResponse<WorkCenter>>(`/work-centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(wc),
    });
  },

  async deleteWorkCenter(id: string) {
    return request<ApiResponse<WorkCenter>>(`/work-centers/${id}`, {
      method: 'DELETE',
    });
  },

  // Bill of Materials (BOM)
  async getBOMs(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<ApiResponse<BOM[]>>(`/boms${qs}`);
  },

  async getBOM(id: string) {
    return request<ApiResponse<BOM>>(`/boms/${id}`);
  },

  async createBOM(bom: Partial<BOM>) {
    return request<ApiResponse<BOM>>('/boms', {
      method: 'POST',
      body: JSON.stringify(bom),
    });
  },

  async updateBOM(id: string, bom: Partial<BOM>) {
    return request<ApiResponse<BOM>>(`/boms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bom),
    });
  },

  async deleteBOM(id: string) {
    return request<ApiResponse<BOM>>(`/boms/${id}`, {
      method: 'DELETE',
    });
  },

  // Seed Data
  async seedDatabase() {
    return request<ApiResponse<{ inventoryCount: number; workCentersCount: number; bomsCount: number }>>(
      '/seed',
      { method: 'POST' }
    );
  },

  // Health
  async checkHealth() {
    return request<{ status: string; system: string; timestamp: string }>('/health');
  },
};

