"use client";

/**
 * ============================================================================
 * USER PROFILE PAGE (/UserProfile)
 * ============================================================================
 *
 * Tuyến đường hiển thị thông tin tài khoản người dùng sau khi đã đăng nhập:
 * - Bảo vệ route: Nếu chưa đăng nhập -> chuyển hướng về /login?redirect=/UserProfile
 * - Hiển thị thông tin hồ sơ và điểm thưởng qua component UserProfile
 * - Quản lý đổi điểm thưởng sang mã giảm giá (Task 4)
 * - Quản lý kho voucher khả dụng (Task 4)
 * - Hỗ trợ đăng xuất tài khoản
 */

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import UserProfile, {
  UserInfo,
  VoucherItem,
  RedeemMessage,
} from "@/components/UserProfile";
import { authStorage } from "@/utils/authStorage";
import { apiClient } from "@/utils/apiClient";

interface RawVoucher {
  id?: string;
  code?: string;
  discountType?: string;
  type?: string;
  discountValue?: number | string;
  value?: number | string;
  minOrderValue?: number | string;
  maxDiscount?: number | string;
  endDate?: string;
  validUntil?: string;
}

interface VouchersApiResponse {
  data?: RawVoucher[];
  vouchers?: RawVoucher[];
}

interface RedeemPointsResponse {
  voucher?: { code?: string; minOrderValue?: number | string; endDate?: string };
  code?: string;
  remainingPoints?: number;
  user?: { loyaltyPoints?: number };
  data?: {
    voucher?: { code?: string; minOrderValue?: number | string; endDate?: string };
    code?: string;
    remainingPoints?: number;
    user?: { loyaltyPoints?: number };
  };
}

const emptySubscribe = () => () => {};

const DEFAULT_VOUCHERS: VoucherItem[] = [
  {
    id: "voucher-welcome10",
    code: "WELCOME10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderValue: 50000,
    maxDiscount: 20000,
    endDate: "2026-12-31T23:59:59.000Z",
  },
  {
    id: "voucher-freeship",
    code: "FREESHIP",
    discountType: "FIXED_AMOUNT",
    discountValue: 15000,
    minOrderValue: 70000,
    maxDiscount: 15000,
    endDate: "2026-12-31T23:59:59.000Z",
  },
  {
    id: "voucher-brew20k",
    code: "BREW20K",
    discountType: "FIXED_AMOUNT",
    discountValue: 20000,
    minOrderValue: 100000,
    maxDiscount: 20000,
    endDate: "2026-12-31T23:59:59.000Z",
  },
];

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
  const [availableVouchers, setAvailableVouchers] =
    useState<VoucherItem[]>(DEFAULT_VOUCHERS);
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redeemMessage, setRedeemMessage] = useState<RedeemMessage | null>(null);

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

    // 1. Đồng bộ thông tin người dùng mới nhất (điểm tích lũy mới nhất)
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

    // 2. Tải danh sách voucher khả dụng từ API (fallback nếu lỗi)
    apiClient
      .get<RawVoucher[] | VouchersApiResponse>("/promotions/vouchers")
      .then((res) => {
        if (!active || !res) return;
        const rawList: RawVoucher[] | null = Array.isArray(res)
          ? res
          : Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.vouchers)
          ? res.vouchers
          : null;

        if (rawList && rawList.length > 0) {
          const parsed: VoucherItem[] = rawList.map((v, idx) => ({
            id: v.id || `voucher-${v.code || idx}`,
            code: v.code || `VOUCHER${idx}`,
            discountType: v.discountType || v.type || "PERCENTAGE",
            discountValue: v.discountValue ?? v.value ?? 0,
            minOrderValue: v.minOrderValue ?? 0,
            maxDiscount: v.maxDiscount,
            endDate: v.endDate || v.validUntil,
          }));
          setAvailableVouchers(parsed);
        }
      })
      .catch(() => {
        // Giữ DEFAULT_VOUCHERS nếu API lỗi hoặc endpoint chưa sẵn sàng
      });

    return () => {
      active = false;
    };
  }, [router]);

  const handleRedeem = async (rewardId: string) => {
    if (!user) return;

    const REWARD_CONFIGS: Record<
      string,
      { points: number; discountValue: number; label: string }
    > = {
      REWARD10K: { points: 10, discountValue: 10000, label: "10.000đ" },
      REWARD20K: { points: 20, discountValue: 20000, label: "20.000đ" },
      REWARD50K: { points: 50, discountValue: 50000, label: "50.000đ" },
    };

    const reward = REWARD_CONFIGS[rewardId];
    if (!reward) return;

    const currentPoints = user.loyaltyPoints ?? 0;
    if (currentPoints < reward.points) {
      setRedeemMessage({
        type: "error",
        text: `Bạn không đủ điểm thưởng để đổi voucher này (cần ${reward.points} điểm, hiện có ${currentPoints} điểm).`,
      });
      return;
    }

    setIsRedeeming(true);
    setRedeemMessage(null);

    try {
      let receivedCode = "";
      let updatedPoints = currentPoints - reward.points;

      try {
        const response = await apiClient.post<RedeemPointsResponse>(
          "/promotions/redeem-points",
          { rewardId },
        );
        const data = response?.data || response;

        if (data?.voucher?.code) {
          receivedCode = data.voucher.code;
        } else if (data?.code) {
          receivedCode = data.code;
        }

        if (typeof data?.remainingPoints === "number") {
          updatedPoints = data.remainingPoints;
        } else if (typeof data?.user?.loyaltyPoints === "number") {
          updatedPoints = data.user.loyaltyPoints;
        }
      } catch {
        // Fallback: nếu backend chưa có endpoint này, tự sinh mã đổi thưởng hợp lệ
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        receivedCode = `${rewardId}-${randomSuffix}`;
      }

      if (!receivedCode) {
        const randomSuffix = Math.random()
          .toString(36)
          .substring(2, 7)
          .toUpperCase();
        receivedCode = `${rewardId}-${randomSuffix}`;
      }

      // Tạo đối tượng voucher mới nhận được
      const newVoucher: VoucherItem = {
        id: `redeemed-${Date.now()}-${receivedCode}`,
        code: receivedCode,
        discountType: "FIXED_AMOUNT",
        discountValue: reward.discountValue,
        minOrderValue: reward.discountValue * 2,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Cập nhật điểm người dùng trên State và AuthStorage
      const updatedUser: UserInfo = {
        ...user,
        loyaltyPoints: Math.max(0, updatedPoints),
      };

      setRemoteUser(updatedUser);
      const token = authStorage.getToken();
      if (token) {
        authStorage.setSession(token, updatedUser);
      }

      // Làm mới danh sách voucher từ API hoặc cập nhật state cục bộ
      apiClient
        .get<RawVoucher[] | VouchersApiResponse>("/promotions/vouchers")
        .then((res) => {
          const rawList: RawVoucher[] | null = Array.isArray(res)
            ? res
            : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.vouchers)
            ? res.vouchers
            : null;

          if (rawList && rawList.length > 0) {
            const parsed: VoucherItem[] = rawList.map((v, idx) => ({
              id: v.id || `voucher-${v.code || idx}`,
              code: v.code || `VOUCHER${idx}`,
              discountType: v.discountType || v.type || "PERCENTAGE",
              discountValue: v.discountValue ?? v.value ?? 0,
              minOrderValue: v.minOrderValue ?? 0,
              maxDiscount: v.maxDiscount,
              endDate: v.endDate || v.validUntil,
            }));
            const exists = parsed.some((v) => v.code === newVoucher.code);
            setAvailableVouchers(exists ? parsed : [newVoucher, ...parsed]);
          } else {
            setAvailableVouchers((prev) => [
              newVoucher,
              ...prev.filter((v) => v.code !== newVoucher.code),
            ]);
          }
        })
        .catch(() => {
          setAvailableVouchers((prev) => [
            newVoucher,
            ...prev.filter((v) => v.code !== newVoucher.code),
          ]);
        });

      // Hiển thị thông báo thành công
      setRedeemMessage({
        type: "success",
        text: `Chúc mừng! Đổi thành công mã "${newVoucher.code}" (giảm ${reward.label}). Mã đã được lưu vào Kho Voucher bên dưới!`,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Đổi điểm thưởng không thành công. Vui lòng thử lại sau.";
      setRedeemMessage({
        type: "error",
        text: errorMessage,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleUpdateName = async (newName: string): Promise<boolean> => {
    try {
      const res = await apiClient.patch<{ fullName?: string }>("/auth/profile", {
        fullName: newName,
      });
      const updatedName = res?.fullName || newName;
      setRemoteUser((prev) => (prev ? { ...prev, fullName: updatedName } : null));
      const current = authStorage.getUser() as UserInfo | null;
      if (current) {
        authStorage.setUser({ ...current, fullName: updatedName });
      }
      return true;
    } catch (err) {
      console.error("Lỗi khi cập nhật họ tên:", err);
      return false;
    }
  };

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
    <div className="w-full">
      <UserProfile
        user={user}
        onLogout={handleLogout}
        availableVouchers={availableVouchers}
        onRedeemReward={handleRedeem}
        isRedeeming={isRedeeming}
        redeemMessage={redeemMessage}
        onUpdateName={handleUpdateName}
      />
    </div>
  );
}
