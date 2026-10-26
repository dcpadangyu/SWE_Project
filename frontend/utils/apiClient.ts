/**
 * ============================================================================
 * BASE API CLIENT (BỘ GỌI API DÙNG CHUNG PHÍA FRONTEND)
 * ============================================================================
 * 
 * Mục đích:
 * - Đóng gói hàm fetch chuẩn mực để kết nối từ Next.js tới Backend NestJS.
 * - Tự động đính kèm địa chỉ API gốc (mặc định http://localhost:8080).
 * - Tự động đính kèm JWT token từ localStorage vào Header Authorization khi có đăng nhập.
 * - Chuẩn hóa xử lý lỗi phản hồi từ máy chủ.
 */

import { ApiResponse } from '@/types/brewlite';

// Địa chỉ gốc của Backend API (ưu tiên biến môi trường NEXT_PUBLIC_API_URL)
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Tùy chọn cấu hình khi gửi request
 */
interface RequestOptions extends RequestInit {
  data?: unknown; // Dữ liệu payload gửi kèm nếu là POST/PUT/PATCH
  token?: string; // Token xác thực nếu muốn truyền trực tiếp
}

/**
 * Hàm gửi HTTP Request dùng chung
 * 
 * @param endpoint Đường dẫn API con (ví dụ: '/products', '/health', '/orders')
 * @param options Cấu hình request (method, headers, body...)
 * @returns Promise chứa dữ liệu phản hồi kiểu T
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { data, token, headers, ...customConfig } = options;

  // 1. Tự động lấy JWT token đã lưu trong trình duyệt nếu không truyền vào
  let authToken = token;
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('brewlite_token') || undefined;
  }

  // 2. Thiết lập Headers mặc định
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // 3. Chuẩn bị cấu hình gửi đi
  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  // 4. Chuẩn hóa đường dẫn endpoint (bảo đảm luôn có dấu / ở đầu)
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(fullUrl, config);

    // Nếu mã HTTP không thành công (4xx, 5xx), ném ra lỗi kèm nội dung backend trả về
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage =
        errorBody.message || `Lỗi API (${response.status}): ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Đọc và trả về dữ liệu JSON
    return (await response.json()) as T;
  } catch (error: any) {
    console.error(`[API Error] Thất bại khi gọi ${fullUrl}:`, error.message);
    throw error;
  }
}

/**
 * Các hàm tiện ích tương ứng với từng phương thức HTTP
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', data }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', data }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
