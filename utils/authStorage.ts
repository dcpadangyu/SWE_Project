// frontend/utils/authStorage.ts
const TOKEN_KEY = 'token'; // Đổi thành 'accessToken' nếu apiClient.ts của TV1 dùng key khác
const USER_KEY = 'brewlite_user';

export const authStorage = {
  setSession(token: string, user: any) {
    if (typeof window === 'undefined') return;
    // Lưu vào localStorage cho apiClient.ts
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('accessToken', token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    // Lưu vào cookie (thời hạn 1 ngày)
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
    window.dispatchEvent(new Event('auth_updated'));
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem(USER_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
    window.dispatchEvent(new Event('auth_updated'));
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