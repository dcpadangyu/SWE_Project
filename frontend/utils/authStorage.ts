// frontend/utils/authStorage.ts
const TOKEN_KEY = 'brewlite_token';
const USER_KEY = 'brewlite_user';

export const authStorage = {
  setSession(token: string, user: unknown) {
    if (typeof window === 'undefined') return;
    // Lưu đúng khóa 'brewlite_token' để apiClient.ts đọc được
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Lưu đồng bộ vào cookie (thời hạn 1 ngày)
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
    window.dispatchEvent(new Event('auth_updated'));
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
    window.dispatchEvent(new Event('auth_updated'));
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
};
