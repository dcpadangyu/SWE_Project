"use client";

/**
 * ============================================================================
 * USER PROFILE PAGE (/UserProfile)
 * ============================================================================
 *
 * Tuyến đường hiển thị thông tin tài khoản người dùng sau khi đã đăng nhập:
 * - Bảo vệ route: Nếu chưa đăng nhập -> chuyển hướng về /login?redirect=/UserProfile
 * - Hiển thị thông tin hồ sơ và điểm thưởng qua component UserProfile
 * - Hỗ trợ đăng xuất tài khoản
 */

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import UserProfile, { UserInfo } from "@/components/UserProfile";
import { authStorage } from "@/utils/authStorage";
import { apiClient } from "@/utils/apiClient";

const emptySubscribe = () => () => {};

export default function UserProfilePage() {
  const router = useRouter();

  // Đảm bảo đồng bộ HTML giữa SSR và Client để không bị Hydration Mismatch
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [remoteUser, setRemoteUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Chỉ đọc dữ liệu từ localStorage khi đã ở phía Client
  const localUser = isClient ? (authStorage.getUser() as UserInfo | null) : null;
  const user = remoteUser || localUser;

  useEffect(() => {
    const token = authStorage.getToken();
    const storedUser = authStorage.getUser() as UserInfo | null;

    if (!token || !storedUser) {
      router.replace("/login?redirect=/UserProfile");
      return;
    }

    let active = true;

    // Đồng bộ thông tin mới nhất từ máy chủ (điểm tích lũy mới nhất)
    apiClient
      .get<{ user?: UserInfo } | UserInfo>("/auth/me")
      .then((data) => {
        if (!active) return;
        const freshUser = (
          data && "user" in data ? data.user : data
        ) as UserInfo;
        if (freshUser && freshUser.email) {
          setRemoteUser(freshUser);
          authStorage.setSession(token, freshUser);
        }
      })
      .catch(() => {
        // Nếu lỗi kết nối vẫn giữ thông tin đã lưu trong localStorage
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = () => {
    authStorage.clearSession();
    router.replace("/login");
  };

  if (!isClient || (loading && !user)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 text-sm text-stone-500">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
          <span>Đang tải thông tin tài khoản...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="px-1">
      <UserProfile user={user} onLogout={handleLogout} />
    </main>
  );
}
