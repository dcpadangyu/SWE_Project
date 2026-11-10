"use client";

/**
 * ============================================================================
 * STAFF ROLE GUARD (BẢO VỆ PHÂN QUYỀN NHÂN VIÊN & KHÁCH HÀNG)
 * ============================================================================
 *
 * Quy tắc nghiệp vụ:
 * 1. Nhân viên (role: BARISTA) chỉ được phép hoạt động trên cổng /staff (và trang /login).
 *    Nếu nhân viên cố tình truy cập vào các trang dành cho khách hàng
 *    (/, /cart, /orders, /UserProfile, /products/...), hệ thống sẽ tự động chuyển hướng về /staff.
 * 2. Khách hàng thông thường (CUSTOMER) hoặc khách vãng lai không bị ảnh hưởng bởi guard này.
 */

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authStorage } from "@/utils/authStorage";

const emptySubscribe = () => () => {};

export default function StaffRoleGuard() {
  const pathname = usePathname();
  const router = useRouter();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isClient) return;

    const checkRole = () => {
      const user = authStorage.getUser();
      const isBarista = user?.role === "BARISTA";

      if (isBarista) {
        // Danh sách các tuyến đường nhân viên được phép hoạt động
        const isAllowed = pathname.startsWith("/staff") || pathname === "/login";
        if (!isAllowed) {
          router.replace("/staff");
        }
      }
    };

    checkRole();
    window.addEventListener("auth_updated", checkRole);
    return () => window.removeEventListener("auth_updated", checkRole);
  }, [isClient, pathname, router]);

  return null;
}
