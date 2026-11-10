"use client";

/**
 * ============================================================================
 * STAFF PORTAL (/staff) - QUẢN LÝ QUẦY PHA CHẾ, KHO NGUYÊN LIỆU & SẢN PHẨM BREWLITE
 * ============================================================================
 *
 * Chức năng dành riêng cho Barista & Quản lý cửa hàng:
 * 1. Thông tin Staff & Chỉnh sửa họ tên (Đồng bộ với UserProfile).
 * 2. Quản lý trạng thái đơn hàng (Order State Queue & Hoàn tiền).
 * 3. Quản lý kho nguyên liệu:
 *    - Thêm nguyên liệu mới, Sửa nguyên liệu, Xóa nguyên liệu.
 *    - Lịch sử thay đổi nguyên liệu (Audit Log) đồng bộ mọi Staff theo thời gian thực.
 *    - Quy tắc màu: Thêm (Xanh), Xóa (Đỏ), Sửa (Vàng), Trừ theo đơn hàng (Trắng).
 * 4. Sản phẩm (Đổi tên từ Công thức & Tồn kho món):
 *    - Thêm sản phẩm mới kèm công thức ban đầu.
 *    - Chỉnh sửa công thức định lượng (S, M, L) và tự động tính lại tồn kho (Bottleneck).
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utils/apiClient";
import { authStorage } from "@/utils/authStorage";
import type { Order, OrderStatus, Ingredient, RecipeItem, Role, IngredientAuditLog, Size } from "@/types/brewlite";

interface StaffOrderUser {
  id: string;
  email: string;
  fullName?: string | null;
  role: Role;
}

interface StaffOrder extends Omit<Order, "items"> {
  orderId?: string;
  user?: StaffOrderUser;
  items: Array<{
    id?: string;
    productId: string;
    productName: string;
    size: "S" | "M" | "L";
    quantity: number;
    unitPrice: number;
    subtotal: number;
    selectedToppings: Array<{ id: string; name: string; price: number }>;
  }>;
}

interface ProductWithRecipes {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceS?: number;
  priceM?: number;
  priceL?: number;
  category?: string | { name?: string };
  categoryId?: string;
  stock: number;
  isAvailable: boolean;
  recipes: RecipeItem[];
}

export default function StaffPortalPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<StaffOrderUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Đồng bộ thông tin người dùng an toàn, không tạo object reference mới mỗi render
  useEffect(() => {
    const syncUser = () => {
      const stored = authStorage.getUser() as StaffOrderUser | null;
      if (stored && stored.email) {
        setCurrentUser({
          id: stored.id || "",
          email: stored.email,
          fullName: stored.fullName,
          role: (stored.role as Role) || "CUSTOMER",
        });
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    };

    syncUser();
    window.addEventListener("auth_updated", syncUser);
    return () => window.removeEventListener("auth_updated", syncUser);
  }, []);

  // Tab điều hướng: 'orders' | 'inventory' | 'recipes' (Sản phẩm)
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "recipes">("orders");

  const handleTabChange = (tab: "orders" | "inventory" | "recipes") => {
    setActiveTab(tab);
    if (tab === "orders") {
      void fetchOrders();
    } else if (tab === "inventory") {
      void fetchIngredients();
      void fetchAuditLogs();
    } else if (tab === "recipes") {
      void fetchRecipes();
      void fetchIngredients();
    }
  };

  // State: Tab Đơn hàng
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderFilter, setOrderFilter] = useState<
    "ALL" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "REFUND_PENDING" | "CANCELLED"
  >("ALL");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // State: Tab Nguyên liệu
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [inventoryMessage, setInventoryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // State: Lịch sử Audit Log nguyên liệu
  const [auditLogs, setAuditLogs] = useState<IngredientAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsSection, setShowLogsSection] = useState(true);

  // State: Modal Nhập nguyên liệu (Restock)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>("");
  const [restockAction, setRestockAction] = useState<"ADD" | "SET">("ADD");
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // State: Modal Thêm nguyên liệu mới (CREATE)
  const [isCreateIngredientOpen, setIsCreateIngredientOpen] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("g");
  const [newIngredientStock, setNewIngredientStock] = useState("");
  const [newIngredientThreshold, setNewIngredientThreshold] = useState("100");
  const [isSubmittingCreateIng, setIsSubmittingCreateIng] = useState(false);

  // State: Modal Sửa nguyên liệu (UPDATE)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editIngName, setEditIngName] = useState("");
  const [editIngUnit, setEditIngUnit] = useState("");
  const [editIngStock, setEditIngStock] = useState("");
  const [editIngThreshold, setEditIngThreshold] = useState("");
  const [editIngReason, setEditIngReason] = useState("");
  const [isSubmittingEditIng, setIsSubmittingEditIng] = useState(false);

  // State: Tab Sản phẩm (Recipes & Products)
  const [recipesData, setRecipesData] = useState<ProductWithRecipes[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // State: Modal Thêm sản phẩm mới
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Cà phê");
  const [newProdPriceS, setNewProdPriceS] = useState("30000");
  const [newProdPriceM, setNewProdPriceM] = useState("35000");
  const [newProdPriceL, setNewProdPriceL] = useState("40000");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdRecipes, setNewProdRecipes] = useState<Array<{ ingredientId: string; size: Size; amount: number }>>([]);
  const [isSubmittingCreateProd, setIsSubmittingCreateProd] = useState(false);

  // State: Modal Chỉnh sửa công thức sản phẩm
  const [editingProductRecipes, setEditingProductRecipes] = useState<ProductWithRecipes | null>(null);
  const [currentRecipeItems, setCurrentRecipeItems] = useState<Array<{ ingredientId: string; size: Size; amount: number }>>([]);
  const [isSubmittingRecipeUpdate, setIsSubmittingRecipeUpdate] = useState(false);

  // State: Modal Đổi tên Staff
  const [isEditingStaffName, setIsEditingStaffName] = useState(false);
  const [staffNameInput, setStaffNameInput] = useState("");
  const [isSubmittingStaffName, setIsSubmittingStaffName] = useState(false);
  const [staffProfileMessage, setStaffProfileMessage] = useState<string | null>(null);

  // 1. Fetch danh sách đơn hàng cho Staff
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await apiClient.get<StaffOrder[]>("/orders/staff/all");
      const list = Array.isArray(res) ? res : (res as { data?: StaffOrder[] })?.data || [];
      const normalized = list.map((o: StaffOrder) => ({
        ...o,
        id: o.id || o.orderId || "",
      }));
      setOrders(normalized);
      setOrderMessage(null);
    } catch (err: unknown) {
      console.error("Lỗi tải đơn hàng staff:", err);
      setOrderMessage({
        type: "error",
        text: "Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.",
      });
    } finally {
      setLoadingOrders(false);
    }
  };

  // 2. Fetch danh sách nguyên liệu
  const fetchIngredients = async () => {
    setLoadingIngredients(true);
    try {
      const res = await apiClient.get<Ingredient[]>("/inventory/ingredients");
      const list = Array.isArray(res) ? res : (res as { data?: Ingredient[] })?.data || [];
      setIngredients(list);
      setInventoryMessage(null);
    } catch (err: unknown) {
      console.error("Lỗi tải nguyên liệu:", err);
      setInventoryMessage({
        type: "error",
        text: "Không thể tải danh sách nguyên liệu.",
      });
    } finally {
      setLoadingIngredients(false);
    }
  };

  // 3. Fetch Lịch sử Audit Log nguyên liệu
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await apiClient.get<IngredientAuditLog[]>("/inventory/ingredients/logs?limit=50");
      const list = Array.isArray(res) ? res : (res as { data?: IngredientAuditLog[] })?.data || [];
      setAuditLogs(list);
    } catch (err) {
      console.error("Lỗi tải audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // 4. Fetch danh sách sản phẩm & công thức
  const fetchRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const res = await apiClient.get<ProductWithRecipes[]>("/inventory/recipes");
      const list = Array.isArray(res) ? res : (res as { data?: ProductWithRecipes[] })?.data || [];
      setRecipesData(list);
    } catch (err) {
      console.error("Lỗi tải sản phẩm & công thức:", err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  // Khởi tạo tải danh sách đơn hàng lần đầu khi vào trang
  useEffect(() => {
    let ignore = false;
    const loadInitialOrders = async () => {
      try {
        const res = await apiClient.get<StaffOrder[]>("/orders/staff/all");
        if (ignore) return;
        const list = Array.isArray(res) ? res : (res as { data?: StaffOrder[] })?.data || [];
        setOrders(list.map((o) => ({ ...o, id: o.id || o.orderId || "" })));
        setOrderMessage(null);
      } catch (_err) {
        if (ignore) return;
        console.error("Lỗi tải đơn hàng ban đầu:", _err);
      } finally {
        if (!ignore) setLoadingOrders(false);
      }
    };

    void loadInitialOrders();
    return () => {
      ignore = true;
    };
  }, []);

  // Handler: Cập nhật họ tên Staff
  const handleUpdateStaffName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffNameInput.trim()) return;

    setIsSubmittingStaffName(true);
    setStaffProfileMessage(null);
    try {
      const res = await apiClient.patch<{ fullName?: string }>("/auth/profile", {
        fullName: staffNameInput.trim(),
      });
      const newName = res?.fullName || staffNameInput.trim();
      setCurrentUser((prev) => (prev ? { ...prev, fullName: newName } : null));

      const current = authStorage.getUser() as StaffOrderUser | null;
      if (current) {
        authStorage.setUser({ ...current, fullName: newName });
      }

      setStaffProfileMessage("Đã cập nhật họ tên thành công!");
      setTimeout(() => {
        setIsEditingStaffName(false);
        setStaffProfileMessage(null);
      }, 1200);
    } catch {
      setStaffProfileMessage("Có lỗi xảy ra khi cập nhật họ tên.");
    } finally {
      setIsSubmittingStaffName(false);
    }
  };

  // Handler: Chuyển trạng thái đơn hàng (PAID -> PREPARING -> READY -> COMPLETED)
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (!orderId) {
      setOrderMessage({ type: "error", text: "Không tìm thấy mã định danh đơn hàng (orderId)." });
      return;
    }
    setUpdatingOrderId(orderId);
    setOrderMessage(null);
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: nextStatus });
      setOrderMessage({
        type: "success",
        text: `Đã cập nhật trạng thái đơn sang "${nextStatus}" thành công!`,
      });
      await fetchOrders();
      // Nếu chuyển sang PREPARING, có thể đã trừ nguyên liệu -> làm mới audit logs nếu đang ở tab kho
      if (nextStatus === "PREPARING") {
        void fetchAuditLogs();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Cập nhật trạng thái thất bại.";
      setOrderMessage({ type: "error", text: errMsg });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handler: Chấp nhận hoàn tiền cho đơn hàng
  const handleApproveRefund = async (orderId: string) => {
    const confirmApprove = window.confirm(
      "Bạn có chắc chắn muốn chấp nhận hoàn tiền cho đơn hàng này không? Đơn sẽ chuyển sang trạng thái ĐÃ HỦY và tiền sẽ được hoàn trả cho khách."
    );
    if (!confirmApprove) return;

    setUpdatingOrderId(orderId);
    setOrderMessage(null);
    try {
      const res = await apiClient.post<{ message: string }>(`/orders/${orderId}/approve-refund`);
      setOrderMessage({
        type: "success",
        text: res.message || "Đã phê duyệt hoàn tiền thành công!",
      });
      await fetchOrders();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Phê duyệt hoàn tiền thất bại.";
      setOrderMessage({ type: "error", text: errMsg });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handler: Nhập thêm nguyên liệu (Restock)
  const handleSubmitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    const qty = parseFloat(restockAmount);
    if (isNaN(qty) || qty < 0) {
      setInventoryMessage({ type: "error", text: "Vui lòng nhập số lượng hợp lệ (>= 0)." });
      return;
    }

    setIsSubmittingRestock(true);
    setInventoryMessage(null);
    try {
      await apiClient.patch(`/inventory/ingredients/${selectedIngredient.id}/stock`, {
        quantity: qty,
        action: restockAction,
      });

      setInventoryMessage({
        type: "success",
        text: `Đã cập nhật tồn kho cho "${selectedIngredient.name}" thành công!`,
      });
      setSelectedIngredient(null);
      setRestockAmount("");
      await fetchIngredients();
      await fetchAuditLogs();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Cập nhật nguyên liệu thất bại.";
      setInventoryMessage({ type: "error", text: errMsg });
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Handler: Thêm nguyên liệu mới (CREATE)
  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim() || !newIngredientUnit.trim()) {
      alert("Vui lòng điền đầy đủ tên và đơn vị tính.");
      return;
    }
    const stockVal = parseFloat(newIngredientStock) || 0;
    const thresholdVal = parseFloat(newIngredientThreshold) || 100;

    setIsSubmittingCreateIng(true);
    try {
      await apiClient.post("/inventory/ingredients", {
        name: newIngredientName.trim(),
        unit: newIngredientUnit.trim(),
        stock: stockVal,
        minThreshold: thresholdVal,
      });

      setInventoryMessage({
        type: "success",
        text: `Đã thêm nguyên liệu "${newIngredientName.trim()}" thành công!`,
      });
      setIsCreateIngredientOpen(false);
      setNewIngredientName("");
      setNewIngredientStock("");
      setNewIngredientThreshold("100");
      await fetchIngredients();
      await fetchAuditLogs();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Thêm nguyên liệu thất bại.";
      alert(errMsg);
    } finally {
      setIsSubmittingCreateIng(false);
    }
  };

  // Handler: Mở Modal Sửa nguyên liệu (UPDATE)
  const openEditIngredientModal = (item: Ingredient) => {
    setEditingIngredient(item);
    setEditIngName(item.name);
    setEditIngUnit(item.unit);
    setEditIngStock(String(item.stock));
    setEditIngThreshold(String(item.minThreshold));
    setEditIngReason("");
  };

  // Handler: Lưu Sửa nguyên liệu
  const handleSaveEditIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient) return;

    setIsSubmittingEditIng(true);
    try {
      await apiClient.patch(`/inventory/ingredients/${editingIngredient.id}`, {
        name: editIngName.trim(),
        unit: editIngUnit.trim(),
        stock: parseFloat(editIngStock) || 0,
        minThreshold: parseFloat(editIngThreshold) || 100,
        reason: editIngReason.trim() || "Cập nhật thông tin nguyên liệu",
      });

      setInventoryMessage({
        type: "success",
        text: `Đã cập nhật nguyên liệu "${editIngName.trim()}" thành công!`,
      });
      setEditingIngredient(null);
      await fetchIngredients();
      await fetchAuditLogs();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Cập nhật nguyên liệu thất bại.";
      alert(errMsg);
    } finally {
      setIsSubmittingEditIng(false);
    }
  };

  // Handler: Xóa nguyên liệu (DELETE)
  const handleDeleteIngredient = async (item: Ingredient) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa nguyên liệu "${item.name}" không? Hành động này sẽ được ghi vào lịch sử thay đổi (màu đỏ).`
    );
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/inventory/ingredients/${item.id}`);
      setInventoryMessage({
        type: "success",
        text: `Đã xóa nguyên liệu "${item.name}" thành công!`,
      });
      await fetchIngredients();
      await fetchAuditLogs();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Xóa nguyên liệu thất bại.";
      setInventoryMessage({ type: "error", text: errMsg });
    }
  };

  // Handler: Mở Modal Sửa công thức sản phẩm
  const openEditRecipeModal = (prod: ProductWithRecipes) => {
    setEditingProductRecipes(prod);
    const existing = (prod.recipes || []).map((r) => ({
      ingredientId: r.ingredientId,
      size: r.size as Size,
      amount: Number(r.amount),
    }));
    setCurrentRecipeItems(existing);
  };

  // Handler: Lưu công thức sản phẩm
  const handleSaveProductRecipes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductRecipes) return;

    setIsSubmittingRecipeUpdate(true);
    try {
      await apiClient.put(`/inventory/products/${editingProductRecipes.id}/recipes`, {
        recipes: currentRecipeItems.filter((r) => r.amount > 0 && r.ingredientId),
      });

      setInventoryMessage({
        type: "success",
        text: `Đã cập nhật công thức cho "${editingProductRecipes.name}" và tính lại tồn kho thành công!`,
      });
      setEditingProductRecipes(null);
      await fetchRecipes();
    } catch {
      alert("Lỗi khi lưu công thức sản phẩm.");
    } finally {
      setIsSubmittingRecipeUpdate(false);
    }
  };

  // Handler: Tạo sản phẩm mới
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      alert("Vui lòng nhập tên món.");
      return;
    }

    setIsSubmittingCreateProd(true);
    try {
      await apiClient.post("/inventory/products", {
        name: newProdName.trim(),
        priceS: parseFloat(newProdPriceS) || 0,
        priceM: parseFloat(newProdPriceM) || 0,
        priceL: parseFloat(newProdPriceL) || 0,
        description: newProdDesc.trim() || undefined,
        imageUrl: newProdImage.trim() || undefined,
        recipes: newProdRecipes.filter((r) => r.amount > 0 && r.ingredientId),
      });

      setInventoryMessage({
        type: "success",
        text: `Đã thêm sản phẩm "${newProdName.trim()}" thành công!`,
      });
      setIsCreateProductOpen(false);
      setNewProdName("");
      setNewProdDesc("");
      setNewProdImage("");
      setNewProdRecipes([]);
      await fetchRecipes();
    } catch {
      alert("Lỗi khi tạo sản phẩm mới.");
    } finally {
      setIsSubmittingCreateProd(false);
    }
  };

  // Handler: Kích hoạt tính lại toàn bộ tồn kho đồ uống
  const handleRecalculateStock = async () => {
    setIsRecalculating(true);
    setInventoryMessage(null);
    try {
      const res = await apiClient.post<{ message: string }>(
        "/inventory/recalculate-stock"
      );
      setInventoryMessage({
        type: "success",
        text: res.message || "Tính lại tồn kho hoàn tất.",
      });
      await fetchIngredients();
      await fetchRecipes();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Tính lại tồn kho thất bại.";
      setInventoryMessage({ type: "error", text: errMsg });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Đăng xuất nhân viên
  const handleLogout = () => {
    authStorage.clearSession();
    router.replace("/login");
  };

  // --------------------------------------------------------------------------
  // RENDER: GIAO DIỆN KIỂM SOÁT QUYỀN TRUY CẬP
  // --------------------------------------------------------------------------
  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-sm text-stone-500">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
          <span>Đang xác thực quyền nhân viên...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🔒</div>
        <h2 className="mt-3 text-xl font-bold text-stone-800">Yêu cầu đăng nhập</h2>
        <p className="mt-2 text-sm text-stone-600">
          Vui lòng đăng nhập với tài khoản Nhân viên (Barista) hoặc Quản trị viên để truy cập cổng Staff Portal.
        </p>
        <div className="mt-6">
          <Link
            href="/login?redirect=/staff"
            className="inline-block rounded-xl bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-800"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  if (currentUser.role !== "BARISTA" && currentUser.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">🚫</div>
        <h2 className="mt-3 text-xl font-bold text-red-700">Truy cập bị từ chối (403 Forbidden)</h2>
        <p className="mt-2 text-sm text-stone-600">
          Tài khoản của bạn ({currentUser.email}) là tài khoản Khách hàng (<strong>{currentUser.role}</strong>). Khu vực này chỉ dành riêng cho Nhân viên quầy pha chế (Barista) và Quản trị viên cửa hàng.
        </p>
        <div className="mt-6 flex justify-center space-x-3">
          <Link
            href="/"
            className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            ← Về trang chủ thực đơn
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  // Lọc đơn hàng theo filter
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "ALL") return true;
    if (orderFilter === "REFUND_PENDING") return o.refundRequest?.status === "PENDING";
    return o.status === orderFilter;
  });

  const staffDisplayName = currentUser.fullName?.trim() || "Nhân viên Pha chế";
  const staffInitialChar = staffDisplayName.charAt(0).toUpperCase();

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* 1. THẺ THÔNG TIN PROFILE STAFF (KHỚP GIAO DIỆN USERPROFILE)        */}
      {/* ==================================================================== */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-6 py-6 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar chữ cái đầu */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-500 text-2xl font-black text-amber-950 shadow-md">
                {staffInitialChar}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-3">
                  <h2 className="truncate text-xl font-bold text-amber-50">
                    {staffDisplayName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffNameInput(currentUser.fullName || "");
                      setStaffProfileMessage(null);
                      setIsEditingStaffName(true);
                    }}
                    className="inline-flex items-center space-x-1 rounded-lg bg-amber-700/80 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-600 transition"
                    title="Chỉnh sửa họ tên Staff"
                  >
                    <span>✏️ Đổi tên</span>
                  </button>
                </div>
                <p className="truncate text-xs text-amber-200">{currentUser.email}</p>
                <div className="mt-2 inline-flex items-center rounded-full bg-amber-700/60 px-2.5 py-0.5 text-[11px] font-medium text-amber-100">
                  {currentUser.role === "ADMIN" ? "Quản trị viên Cửa hàng" : "Nhân viên Pha chế (Barista Quầy)"}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-amber-700/80 bg-amber-950/40 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-950/70"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-4">
          <button
            type="button"
            onClick={() => handleTabChange("orders")}
            className={`flex items-center space-x-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "orders"
                ? "border-amber-800 text-amber-900 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>📋 Quản lý Đơn hàng</span>
            {orders.filter((o) => o.status === "PAID").length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                {orders.filter((o) => o.status === "PAID").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("inventory")}
            className={`flex items-center space-x-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "inventory"
                ? "border-amber-800 text-amber-900 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>📦 Kho Nguyên liệu</span>
            {ingredients.filter((i) => i.status === "OUT_OF_STOCK").length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                {ingredients.filter((i) => i.status === "OUT_OF_STOCK").length} hết
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("recipes")}
            className={`flex items-center space-x-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "recipes"
                ? "border-amber-800 text-amber-900 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <span>🍵 Sản phẩm</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: QUẢN LÝ ĐƠN HÀNG                                              */}
      {/* ==================================================================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Thông báo */}
          {orderMessage && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                orderMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{orderMessage.type === "success" ? "✓" : "!"}</span>
                <span>{orderMessage.text}</span>
              </div>
            </div>
          )}

          {/* Bộ lọc trạng thái đơn */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">Lọc theo:</span>
              {(
                [
                  { id: "ALL", label: "Tất cả" },
                  { id: "PAID", label: "Đã thanh toán (Chờ làm)" },
                  { id: "PREPARING", label: "Đang pha chế" },
                  { id: "READY", label: "Chờ lấy nước" },
                  { id: "COMPLETED", label: "Hoàn tất" },
                  { id: "REFUND_PENDING", label: "⚠️ Yêu cầu hoàn tiền" },
                  { id: "CANCELLED", label: "Đã hủy" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOrderFilter(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    orderFilter === tab.id
                      ? "bg-amber-900 text-white shadow-sm"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={loadingOrders}
              onClick={() => void fetchOrders()}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              <span>{loadingOrders ? "Đang tải..." : "🔄 Làm mới"}</span>
            </button>
          </div>

          {/* Danh sách thẻ đơn hàng */}
          {loadingOrders ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-8">
              <div className="flex items-center space-x-2 text-sm text-stone-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
                <span>Đang tải danh sách đơn hàng...</span>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 shadow-sm">
              <p className="text-3xl">☕</p>
              <p className="mt-2 text-sm font-semibold text-stone-700">Không có đơn hàng nào trong danh mục này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => {
                const isUpdating = updatingOrderId === order.id;
                const hasPendingRefund = order.refundRequest?.status === "PENDING";

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition ${
                      hasPendingRefund
                        ? "border-amber-400 ring-2 ring-amber-300/50"
                        : order.status === "PAID"
                          ? "border-blue-300"
                          : order.status === "PREPARING"
                            ? "border-amber-300"
                            : order.status === "READY"
                              ? "border-emerald-300"
                              : "border-stone-200"
                    }`}
                  >
                    <div>
                      {/* Tiêu đề thẻ đơn */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-black text-amber-900">{order.orderCode}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                order.status === "PAID"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "PREPARING"
                                    ? "bg-amber-100 text-amber-800"
                                    : order.status === "READY"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : order.status === "COMPLETED"
                                        ? "bg-stone-100 text-stone-700"
                                        : "bg-red-100 text-red-700"
                              }`}
                            >
                              {order.status === "PAID"
                                ? "Đã thanh toán"
                                : order.status === "PREPARING"
                                  ? "Đang pha chế"
                                  : order.status === "READY"
                                    ? "Sẵn sàng lấy"
                                    : order.status === "COMPLETED"
                                      ? "Hoàn tất"
                                      : order.status === "CANCELLED"
                                        ? "Đã hủy"
                                        : order.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-stone-500">
                            Khách: {order.user?.fullName || order.user?.email || "Khách vãng lai"}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            •{" "}
                            {new Date(order.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-stone-900">
                            {Number(order.totalAmount).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>

                      {/* Banner Cảnh báo Yêu cầu hoàn tiền */}
                      {hasPendingRefund && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                          <div className="flex items-center space-x-1 font-bold text-red-800">
                            <span>⚠️ Yêu cầu hủy đơn & hoàn tiền</span>
                          </div>
                          <p className="mt-1 text-stone-700">
                            Khách yêu cầu hoàn:{" "}
                            <strong className="text-red-800">
                              {Number(order.refundRequest?.amount || 0).toLocaleString("vi-VN")}đ
                            </strong>
                          </p>
                          {order.refundRequest?.reason && (
                            <p className="mt-0.5 italic text-stone-600">
                              Lý do: &ldquo;{order.refundRequest.reason}&rdquo;
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleApproveRefund(order.id || order.orderId || "")}
                            className="mt-2.5 w-full rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {isUpdating ? "Đang xử lý..." : "✓ Chấp nhận duyệt hoàn tiền"}
                          </button>
                        </div>
                      )}

                      {/* Chi tiết danh sách món */}
                      <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3">
                        {order.items.map((item, idx) => (
                          <div key={item.id ?? idx} className="flex justify-between text-xs">
                            <span className="font-semibold text-stone-800">
                              {item.productName} (Size {item.size}) × {item.quantity}
                            </span>
                            <span className="text-stone-500">
                              {Number(item.subtotal).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.note && (
                        <div className="mt-2.5 rounded-lg bg-stone-50 p-2 text-[11px] text-stone-600">
                          <strong>Ghi chú:</strong> {order.note}
                        </div>
                      )}
                    </div>

                    {/* NÚT THAO TÁC CHUYỂN TRẠNG THÁI ĐƠN */}
                    <div className="mt-4 border-t border-stone-100 pt-3">
                      {order.status === "PAID" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateOrderStatus(order.id || order.orderId || "", "PREPARING")}
                          className="w-full rounded-xl bg-amber-800 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-900 disabled:opacity-50"
                        >
                          {isUpdating ? "Đang lưu..." : "🍵 Bắt đầu pha chế (PREPARING)"}
                        </button>
                      )}

                      {order.status === "PREPARING" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateOrderStatus(order.id || order.orderId || "", "READY")}
                          className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isUpdating ? "Đang lưu..." : "🔔 Pha xong, gọi khách lấy (READY)"}
                        </button>
                      )}

                      {order.status === "READY" && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateOrderStatus(order.id || order.orderId || "", "COMPLETED")}
                          className="w-full rounded-xl bg-stone-800 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-stone-900 disabled:opacity-50"
                        >
                          {isUpdating ? "Đang lưu..." : "✓ Đã giao cho khách (COMPLETED)"}
                        </button>
                      )}

                      {order.status === "COMPLETED" && (
                        <div className="text-center text-xs font-semibold text-emerald-700">
                          ✓ Đơn hàng đã hoàn tất thành công
                        </div>
                      )}

                      {order.status === "CANCELLED" && (
                        <div className="text-center text-xs font-semibold text-red-600">
                          ✕ Đơn hàng đã bị hủy
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: KHO NGUYÊN LIỆU & AUDIT LOG                                   */}
      {/* ==================================================================== */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Thông báo */}
          {inventoryMessage && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                inventoryMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{inventoryMessage.type === "success" ? "✓" : "!"}</span>
                <span>{inventoryMessage.text}</span>
              </div>
            </div>
          )}

          {/* Thẻ thống kê nhanh */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <span className="text-xs text-stone-500">Tổng loại nguyên liệu</span>
              <p className="mt-1 text-2xl font-black text-stone-900">{ingredients.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <span className="text-xs text-emerald-700">Đủ hàng</span>
              <p className="mt-1 text-2xl font-black text-emerald-800">
                {ingredients.filter((i) => i.status === "IN_STOCK").length}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <span className="text-xs text-amber-700">Sắp hết hàng (Low)</span>
              <p className="mt-1 text-2xl font-black text-amber-800">
                {ingredients.filter((i) => i.status === "LOW_STOCK").length}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
              <span className="text-xs text-red-700">Hết hàng (Out of Stock)</span>
              <p className="mt-1 text-2xl font-black text-red-800">
                {ingredients.filter((i) => i.status === "OUT_OF_STOCK").length}
              </p>
            </div>
          </div>

          {/* Thanh công cụ Kho: Thêm mới, Tính lại, Làm mới */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-stone-900">Danh mục Nguyên liệu tồn kho</h3>
              <p className="text-xs text-stone-500">
                Mọi thao tác Thêm, Sửa, Xóa và Trừ khi chế biến đơn đều được ghi lại trong Lịch sử thay đổi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateIngredientOpen(true)}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
              >
                <span>+ Thêm nguyên liệu</span>
              </button>

              <button
                type="button"
                disabled={isRecalculating}
                onClick={handleRecalculateStock}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-amber-700 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                <span>{isRecalculating ? "Đang tính..." : "⚡ Tính lại tồn món"}</span>
              </button>

              <button
                type="button"
                disabled={loadingIngredients}
                onClick={() => {
                  void fetchIngredients();
                  void fetchAuditLogs();
                }}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* Bảng nguyên liệu */}
          {loadingIngredients ? (
            <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-8">
              <div className="flex items-center space-x-2 text-sm text-stone-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
                <span>Đang tải kho nguyên liệu...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Tên nguyên liệu</th>
                      <th className="px-5 py-3.5 font-bold">Đơn vị</th>
                      <th className="px-5 py-3.5 font-bold">Số lượng tồn</th>
                      <th className="px-5 py-3.5 font-bold">Mức cảnh báo</th>
                      <th className="px-5 py-3.5 font-bold">Trạng thái</th>
                      <th className="px-5 py-3.5 text-right font-bold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ingredients.map((item) => (
                      <tr key={item.id} className="transition hover:bg-stone-50/70">
                        <td className="px-5 py-4 font-semibold text-stone-900">{item.name}</td>
                        <td className="px-5 py-4 text-stone-500">{item.unit}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-base font-black ${
                              item.status === "OUT_OF_STOCK"
                                ? "text-red-600"
                                : item.status === "LOW_STOCK"
                                  ? "text-amber-600"
                                  : "text-stone-900"
                            }`}
                          >
                            {Number(item.stock).toLocaleString("vi-VN")} {item.unit}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-stone-500">
                          {Number(item.minThreshold).toLocaleString("vi-VN")} {item.unit}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.status === "OUT_OF_STOCK"
                                ? "bg-red-100 text-red-800"
                                : item.status === "LOW_STOCK"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.status === "OUT_OF_STOCK"
                              ? "Hết hàng"
                              : item.status === "LOW_STOCK"
                                ? "Sắp hết"
                                : "Đủ hàng"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIngredient(item);
                                setRestockAmount("");
                                setRestockAction("ADD");
                              }}
                              className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:border-amber-800 hover:text-amber-900"
                              title="Nhập thêm hàng"
                            >
                              + Nhập kho
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditIngredientModal(item)}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                              title="Sửa thông tin nguyên liệu"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteIngredient(item)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              title="Xóa nguyên liệu"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* LỊCH SỬ THAY ĐỔI NGUYÊN LIỆU (AUDIT LOG - ĐỒNG BỘ MỌI STAFF)      */}
          {/* Quy tắc màu:                                                    */}
          {/* - Thêm (CREATE/RESTOCK): Xanh                                   */}
          {/* - Xóa (DELETE): Đỏ                                              */}
          {/* - Sửa (UPDATE): Vàng                                            */}
          {/* - Trừ theo đơn hàng (ORDER_DEDUCT): Trắng thường               */}
          {/* ================================================================ */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-stone-900">📜 Lịch sử thay đổi kho nguyên liệu</h3>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                    {auditLogs.length} bản ghi
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  Dữ liệu được lưu trữ tập trung tại CSDL và đồng nhất cho toàn bộ nhân viên (Real-time Audit Log).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={loadingLogs}
                  onClick={() => void fetchAuditLogs()}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                >
                  {loadingLogs ? "Đang tải..." : "🔄 Làm mới lịch sử"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogsSection((prev) => !prev)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  {showLogsSection ? "Thu gọn ▲" : "Mở rộng ▼"}
                </button>
              </div>
            </div>

            {/* Chú thích màu sắc */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-stone-600">Quy ước màu:</span>
              <span className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                ● Thêm mới / Nhập kho (Xanh lá)
              </span>
              <span className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-2 py-0.5 font-bold text-red-800">
                ● Xóa nguyên liệu (Đỏ)
              </span>
              <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                ● Sửa thông tin (Vàng)
              </span>
              <span className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-2 py-0.5 font-semibold text-stone-700 shadow-sm">
                ○ Trừ theo đơn hàng (Trắng thường)
              </span>
            </div>

            {showLogsSection && (
              <div className="mt-4 overflow-hidden rounded-xl border border-stone-200">
                {loadingLogs ? (
                  <div className="p-8 text-center text-xs text-stone-500">Đang tải lịch sử...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    Chưa có lịch sử thay đổi nguyên liệu nào được ghi nhận.
                  </div>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 border-b border-stone-200 bg-stone-100 uppercase text-stone-600">
                        <tr>
                          <th className="px-4 py-3 font-bold">Thời gian</th>
                          <th className="px-4 py-3 font-bold">Nguyên liệu</th>
                          <th className="px-4 py-3 font-bold">Hành động</th>
                          <th className="px-4 py-3 font-bold">Biến động</th>
                          <th className="px-4 py-3 font-bold">Tồn kho (Trước → Sau)</th>
                          <th className="px-4 py-3 font-bold">Lý do / Ghi chú</th>
                          <th className="px-4 py-3 font-bold">Người thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {auditLogs.map((log) => {
                          // Quy tắc phân loại màu sắc chính xác theo yêu cầu:
                          // - CREATE / RESTOCK: Xanh
                          // - DELETE: Đỏ
                          // - UPDATE: Vàng
                          // - ORDER_DEDUCT: Trắng thường
                          const isGreen = log.action === "CREATE" || log.action === "RESTOCK";
                          const isRed = log.action === "DELETE";
                          const isYellow = log.action === "UPDATE";
                          const isNormal = log.action === "ORDER_DEDUCT";

                          let rowClass = "bg-white text-stone-800";
                          let badgeClass = "bg-stone-100 text-stone-700 border-stone-200";
                          let actionLabel = "Biến động";

                          if (isGreen) {
                            rowClass = "bg-emerald-50/70 text-emerald-950 font-medium";
                            badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                            actionLabel = log.action === "CREATE" ? "Thêm mới" : "Nhập kho";
                          } else if (isRed) {
                            rowClass = "bg-red-50/70 text-red-950 font-medium";
                            badgeClass = "bg-red-100 text-red-800 border-red-300 font-bold";
                            actionLabel = "Xóa bỏ";
                          } else if (isYellow) {
                            rowClass = "bg-amber-50/80 text-amber-950 font-medium";
                            badgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                            actionLabel = "Chỉnh sửa";
                          } else if (isNormal) {
                            rowClass = "bg-white text-stone-700 hover:bg-stone-50";
                            badgeClass = "bg-stone-100 text-stone-600 border-stone-200";
                            actionLabel = "Trừ theo đơn";
                          }

                          return (
                            <tr key={log.id} className={`${rowClass} transition`}>
                              <td className="px-4 py-3 whitespace-nowrap text-stone-500">
                                {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-3 font-bold">{log.ingredientName}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] ${badgeClass}`}>
                                  {actionLabel}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={`font-black ${
                                    log.changeAmount > 0
                                      ? "text-emerald-700"
                                      : log.changeAmount < 0
                                        ? isRed
                                          ? "text-red-700"
                                          : "text-stone-800"
                                        : "text-stone-500"
                                  }`}
                                >
                                  {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}{" "}
                                  {log.unit}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                                {log.previousStock !== null && log.previousStock !== undefined
                                  ? `${log.previousStock}`
                                  : "?"}{" "}
                                →{" "}
                                <strong className="text-stone-900">
                                  {log.newStock !== null && log.newStock !== undefined ? `${log.newStock}` : "?"}{" "}
                                  {log.unit}
                                </strong>
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate" title={log.reason || ""}>
                                {log.reason || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-stone-600">
                                {log.performedBy}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: SẢN PHẨM (ĐỔI TÊN TỪ CÔNG THỨC & TỒN KHO MÓN)                */}
      {/* ==================================================================== */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="font-bold text-stone-900">Quản lý Sản phẩm & Công thức định lượng</h3>
              <p className="mt-1 text-xs text-stone-500">
                Cho phép thêm sản phẩm mới và chỉnh sửa định lượng nguyên liệu cho các kích cỡ (S, M, L). Tồn kho sẽ
                được hệ thống tự động tính toán lại.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsCreateProductOpen(true)}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800"
              >
                <span>+ Thêm sản phẩm mới</span>
              </button>

              <button
                type="button"
                disabled={loadingRecipes}
                onClick={() => void fetchRecipes()}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                🔄 Làm mới
              </button>
            </div>
          </div>

          {loadingRecipes ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-stone-200 bg-white p-8">
              <div className="flex items-center space-x-2 text-sm text-stone-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
                <span>Đang tải danh sách sản phẩm...</span>
              </div>
            </div>
          ) : recipesData.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 shadow-sm">
              <p>Chưa có sản phẩm nào trong hệ thống.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipesData.map((prod) => (
                <div key={prod.id} className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-stone-900">{prod.name}</h4>
                        <span className="text-xs text-stone-400">
                          Danh mục:{" "}
                          {typeof prod.category === "object"
                            ? prod.category?.name || "Đồ uống"
                            : prod.category || "Đồ uống"}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            prod.stock > 0 && prod.isAvailable
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {prod.stock > 0 && prod.isAvailable ? `Còn pha được: ${prod.stock} ly` : "HẾT HÀNG"}
                        </span>
                      </div>
                    </div>

                    {/* Giá tiền */}
                    <div className="mt-2 flex space-x-3 text-xs text-stone-600">
                      <span>Size S: <strong>{Number(prod.priceS || 0).toLocaleString("vi-VN")}đ</strong></span>
                      <span>Size M: <strong>{Number(prod.priceM || 0).toLocaleString("vi-VN")}đ</strong></span>
                      <span>Size L: <strong>{Number(prod.priceL || 0).toLocaleString("vi-VN")}đ</strong></span>
                    </div>

                    {/* Chi tiết công thức theo Size */}
                    <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-stone-700">Công thức định lượng:</p>
                        <span className="text-[11px] text-stone-400">{(prod.recipes || []).length} mục</span>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(prod.recipes || []).map((r, idx) => (
                          <div key={r.id || idx} className="flex justify-between text-xs text-stone-600">
                            <span>
                              • [Size {r.size}] <strong>{r.ingredient?.name || r.ingredientId}</strong>
                            </span>
                            <span className="font-semibold text-amber-900">
                              {r.amount} {r.ingredient?.unit || "g/ml"}
                            </span>
                          </div>
                        ))}
                        {(!prod.recipes || prod.recipes.length === 0) && (
                          <p className="text-xs italic text-stone-400">Chưa cài công thức (mặc định stock = 0).</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút Chỉnh sửa công thức */}
                  <div className="mt-4 border-t border-stone-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditRecipeModal(prod)}
                      className="w-full rounded-xl bg-amber-50 py-2 text-xs font-bold text-amber-900 border border-amber-300 transition hover:bg-amber-100"
                    >
                      ✏️ Chỉnh sửa công thức
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ĐỔI TÊN STAFF                                               */}
      {/* ==================================================================== */}
      {isEditingStaffName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Chỉnh sửa họ tên Staff</h3>
              <button
                type="button"
                onClick={() => setIsEditingStaffName(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStaffName} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Họ và tên mới</label>
                <input
                  type="text"
                  required
                  value={staffNameInput}
                  onChange={(e) => setStaffNameInput(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
                {staffProfileMessage && (
                  <p className="mt-1 text-xs text-amber-800 font-semibold">{staffProfileMessage}</p>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingStaffName}
                  onClick={() => setIsEditingStaffName(false)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaffName}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingStaffName ? "Đang lưu..." : "Lưu họ tên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: THÊM NGUYÊN LIỆU MỚI (CREATE)                               */}
      {/* ==================================================================== */}
      {isCreateIngredientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">+ Thêm nguyên liệu mới vào kho</h3>
              <button
                type="button"
                onClick={() => setIsCreateIngredientOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIngredient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Tên nguyên liệu</label>
                <input
                  type="text"
                  required
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="VD: Trà Đen Phúc Long, Bột Matcha..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Đơn vị tính</label>
                  <select
                    value={newIngredientUnit}
                    onChange={(e) => setNewIngredientUnit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none bg-white"
                  >
                    <option value="g">gam (g)</option>
                    <option value="ml">mililit (ml)</option>
                    <option value="cái">cái / quả</option>
                    <option value="lon">lon / hộp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Số lượng ban đầu</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={newIngredientStock}
                    onChange={(e) => setNewIngredientStock(e.target.value)}
                    placeholder="VD: 5000"
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Ngưỡng cảnh báo sắp hết</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newIngredientThreshold}
                  onChange={(e) => setNewIngredientThreshold(e.target.value)}
                  placeholder="VD: 200"
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Hệ thống sẽ báo &ldquo;Sắp hết&rdquo; khi số lượng nhỏ hơn ngưỡng này.
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingCreateIng}
                  onClick={() => setIsCreateIngredientOpen(false)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateIng}
                  className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isSubmittingCreateIng ? "Đang thêm..." : "Thêm nguyên liệu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: SỬA NGUYÊN LIỆU (UPDATE)                                    */}
      {/* ==================================================================== */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">Chỉnh sửa nguyên liệu: {editingIngredient.name}</h3>
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditIngredient} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Tên nguyên liệu</label>
                <input
                  type="text"
                  required
                  value={editIngName}
                  onChange={(e) => setEditIngName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Đơn vị tính</label>
                  <input
                    type="text"
                    required
                    value={editIngUnit}
                    onChange={(e) => setEditIngUnit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Số lượng tồn kho</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editIngStock}
                    onChange={(e) => setEditIngStock(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Mức cảnh báo sắp hết</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editIngThreshold}
                  onChange={(e) => setEditIngThreshold(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Lý do điều chỉnh (Audit Log)</label>
                <input
                  type="text"
                  value={editIngReason}
                  onChange={(e) => setEditIngReason(e.target.value)}
                  placeholder="VD: Kiểm kê định kỳ, điều chỉnh hao hụt..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingEditIng}
                  onClick={() => setEditingIngredient(null)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditIng}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingEditIng ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: NHẬP NHANH VÀO KHO (RESTOCK)                                 */}
      {/* ==================================================================== */}
      {selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                Nhập kho: {selectedIngredient.name} ({selectedIngredient.unit})
              </h3>
              <button
                type="button"
                onClick={() => setSelectedIngredient(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitRestock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Hình thức cập nhật</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockAction("ADD")}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      restockAction === "ADD"
                        ? "bg-amber-900 text-white"
                        : "border border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    + Cộng thêm vào kho
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockAction("SET")}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      restockAction === "SET"
                        ? "bg-amber-900 text-white"
                        : "border border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    = Đặt số dư mới
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="restock-qty" className="block text-xs font-semibold text-stone-600">
                  Số lượng ({selectedIngredient.unit})
                </label>
                <input
                  id="restock-qty"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder={`VD: 1000 ${selectedIngredient.unit}`}
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-stone-400">
                  Tồn hiện tại: {selectedIngredient.stock} {selectedIngredient.unit}
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingRestock}
                  onClick={() => setSelectedIngredient(null)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingRestock ? "Đang lưu..." : "Lưu vào kho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: CHỈNH SỬA CÔNG THỨC SẢN PHẨM (EDIT RECIPES)                */}
      {/* ==================================================================== */}
      {editingProductRecipes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Công thức định lượng: {editingProductRecipes.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Hệ thống dùng Size M làm chuẩn bottleneck. Cài đặt lượng dùng cho từng size.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProductRecipes(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProductRecipes} className="mt-4 space-y-4">
              <div className="space-y-3">
                {currentRecipeItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-stone-500">Nguyên liệu</label>
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentRecipeItems((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, ingredientId: val } : r))
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Chọn nguyên liệu --</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block text-[11px] font-semibold text-stone-500">Kích cỡ</label>
                      <select
                        value={item.size}
                        onChange={(e) => {
                          const val = e.target.value as Size;
                          setCurrentRecipeItems((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, size: val } : r))
                          );
                        }}
                        className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs font-semibold bg-white"
                      >
                        <option value="S">Size S</option>
                        <option value="M">Size M</option>
                        <option value="L">Size L</option>
                      </select>
                    </div>

                    <div className="w-32">
                      <label className="block text-[11px] font-semibold text-stone-500">Định lượng</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCurrentRecipeItems((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, amount: val } : r))
                          );
                        }}
                        placeholder="VD: 25"
                        className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs font-semibold bg-white"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentRecipeItems((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Xóa mục này"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Nút thêm dòng nguyên liệu */}
              <button
                type="button"
                onClick={() => {
                  if (ingredients.length === 0) {
                    alert("Chưa có nguyên liệu nào trong kho. Vui lòng thêm nguyên liệu trước!");
                    return;
                  }
                  setCurrentRecipeItems((prev) => [
                    ...prev,
                    {
                      ingredientId: ingredients[0]?.id || "",
                      size: "M",
                      amount: 20,
                    },
                  ]);
                }}
                className="w-full rounded-xl border border-dashed border-stone-300 py-2.5 text-xs font-bold text-stone-600 hover:border-amber-800 hover:text-amber-900"
              >
                + Thêm thành phần nguyên liệu vào công thức
              </button>

              <div className="flex space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSubmittingRecipeUpdate}
                  onClick={() => setEditingProductRecipes(null)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRecipeUpdate}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingRecipeUpdate ? "Đang lưu..." : "Lưu công thức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: THÊM SẢN PHẨM MỚI (CREATE PRODUCT)                          */}
      {/* ==================================================================== */}
      {isCreateProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">+ Thêm sản phẩm mới vào menu</h3>
              <button
                type="button"
                onClick={() => setIsCreateProductOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600">Tên đồ uống / món</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="VD: Trà Đào Cam Sả, Cà Phê Muối..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Danh mục</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-sm font-semibold focus:border-amber-700 focus:outline-none bg-white"
                >
                  <option value="Cà phê">Cà phê</option>
                  <option value="Trà">Trà</option>
                  <option value="Đặc biệt">Đặc biệt</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Giá Size S</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProdPriceS}
                    onChange={(e) => setNewProdPriceS(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Giá Size M</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProdPriceM}
                    onChange={(e) => setNewProdPriceM(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600">Giá Size L</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProdPriceL}
                    onChange={(e) => setNewProdPriceL(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">Mô tả món</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Mô tả hương vị món..."
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-xs font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600">URL ảnh minh họa</label>
                <input
                  type="text"
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  placeholder="https://images.unsplash.com/... (để trống sẽ dùng ảnh mặc định)"
                  className="mt-1 w-full rounded-xl border border-stone-300 p-2 text-xs font-semibold focus:border-amber-700 focus:outline-none"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingCreateProd}
                  onClick={() => setIsCreateProductOpen(false)}
                  className="flex-1 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreateProd}
                  className="flex-1 rounded-xl bg-amber-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {isSubmittingCreateProd ? "Đang tạo..." : "Tạo sản phẩm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
