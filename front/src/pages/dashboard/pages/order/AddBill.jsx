import { useEffect, useState } from "react";
import axios from "axios";
import {
  FaFileInvoiceDollar,
  FaUser,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaTimes,
  FaSave,
  FaSpinner,
  FaUserPlus,
} from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const emptyOrder = () => ({
  size: "",
  customSize: "",
  quantity: 1,
  athleteNumber: "",
  logo: "",
  codeNumber: "",
  jerseyType: "سابلیمیشن",
  price: "",
});

const JERSEY_TYPES = ["سابلیمیشن ", "نیمه سبلیمیشن", "ساده"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "set"];
const CUSTOM_SIZE_VALUE = "__custom__"; // 👈 sentinel

export default function AddBill({ editingBill = null, onSuccess, onCancel }) {
  const isEditing = Boolean(editingBill?.id);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [form, setForm] = useState({
    customerType: "temporary",
    customer: "",
    name: "",
    phoneNumber: "",
    receipt: [],
  });

  const [orders, setOrders] = useState([emptyOrder()]);
  const [receiptInput, setReceiptInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  /* ---------- Inline add-customer state ---------- */
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullname: "",
    phoneNumber: "",
    isActive: true,
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  /* ---------------- Load customers ---------------- */
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await axios.get(
        `${BASE_URL}/customers/active?page=1&limit=200`
      );
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error("load customers error:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  /* ---------------- Prefill when editing ---------------- */
  useEffect(() => {
    if (!editingBill) return;

    setForm({
      customerType: editingBill.customerType || "temporary",
      customer: editingBill.customer ? String(editingBill.customer) : "",
      name: editingBill.name || "",
      phoneNumber: editingBill.phoneNumber || "",
      receipt: Array.isArray(editingBill.receipt) ? editingBill.receipt : [],
    });

    const existingOrders =
      Array.isArray(editingBill.orders) && editingBill.orders.length > 0
        ? editingBill.orders.map((o) => {
            // 👇 detect whether the saved size was one of the fixed ones
            const isFixed = SIZES.includes(o.size);
            return {
              size: isFixed ? o.size : o.size ? CUSTOM_SIZE_VALUE : "",
              customSize: isFixed ? "" : o.size || "",
              quantity: o.quantity ?? 1,
              athleteNumber: o.athleteNumber || "",
              logo: o.logo || "",
              codeNumber: o.codeNumber || "",
              jerseyType: o.jerseyType || "home",
              price: o.price ?? "",
            };
          })
        : [emptyOrder()];

    setOrders(existingOrders);
    setReceiptInput(
      (Array.isArray(editingBill.receipt) ? editingBill.receipt : []).join(",")
    );
  }, [editingBill]);

  /* ---------------- Derived ---------------- */
  const billTotal = orders.reduce((sum, o) => {
    const price = Number(o.price) || 0;
    const qty = Number(o.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const parsedReceipt = receiptInput
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n) && n > 0);

  const paid = parsedReceipt.reduce((a, b) => a + b, 0);
  const remaining = billTotal - paid;

  /* ---------------- Handlers ---------------- */
  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateOrder = (index, key, value) => {
    setOrders((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [key]: value } : o))
    );
  };

  // 👇 when the size select changes, clear the customSize if switching back to a fixed size
  const handleSizeChange = (index, value) => {
    setOrders((prev) =>
      prev.map((o, i) => {
        if (i !== index) return o;
        return {
          ...o,
          size: value,
          customSize: value === CUSTOM_SIZE_VALUE ? o.customSize : "",
        };
      })
    );
  };

  const addOrderRow = () => setOrders((prev) => [...prev, emptyOrder()]);

  const removeOrderRow = (index) =>
    setOrders((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setForm({
      customerType: "temporary",
      customer: "",
      name: "",
      phoneNumber: "",
      receipt: [],
    });
    setOrders([emptyOrder()]);
    setReceiptInput("");
    setError(null);
  };

  /* ---------------- Inline create customer ---------------- */
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerError(null);

    if (!newCustomer.fullname.trim()) {
      setCustomerError("نام کامل الزامی است");
      return;
    }

    setCreatingCustomer(true);
    try {
      const res = await axios.post(`${BASE_URL}/customers`, {
        fullname: newCustomer.fullname.trim(),
        phoneNumber: newCustomer.phoneNumber?.trim() || null,
        isActive: Boolean(newCustomer.isActive),
      });

      const created = res.data.customer || res.data;

      setCustomers((prev) => [created, ...prev]);

      setForm((prev) => ({
        ...prev,
        customerType: "permanent",
        customer: String(created.id),
        name: created.fullname,
        phoneNumber: created.phoneNumber || "",
      }));

      setNewCustomer({ fullname: "", phoneNumber: "", isActive: true });
      setShowAddCustomer(false);
    } catch (err) {
      setCustomerError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          "خطا در ثبت مشتری"
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  /* ---------------- Submit bill ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("نام مشتری الزامی است");
      return;
    }
    if (form.customerType === "permanent" && !form.customer) {
      setError("برای مشتری دائم، انتخاب مشتری الزامی است");
      return;
    }
    if (orders.length === 0) {
      setError("حداقل یک سفارش لازم است");
      return;
    }

    // 👇 validate each order, including the custom-size case
    for (const [i, o] of orders.entries()) {
      const resolvedSize =
        o.size === CUSTOM_SIZE_VALUE ? o.customSize?.trim() : o.size;

      if (!resolvedSize) {
        setError(`سایز سفارش شماره ${i + 1} را وارد کنید`);
        return;
      }
      if (!o.jerseyType || o.price === "" || !o.quantity) {
        setError(`سفارش شماره ${i + 1} اطلاعات ناقص دارد`);
        return;
      }
    }

    const payload = {
      customerType: form.customerType,
      customer:
        form.customerType === "permanent" ? Number(form.customer) : null,
      name: form.name.trim(),
      phoneNumber: form.phoneNumber?.trim() || null,
      total: billTotal,
      receipt: parsedReceipt,
      orders: orders.map((o) => ({
        // 👇 send the resolved size (either fixed or custom)
        size:
          o.size === CUSTOM_SIZE_VALUE ? o.customSize.trim() : o.size,
        quantity: Number(o.quantity),
        athleteNumber: o.athleteNumber || null,
        logo: o.logo || null,
        codeNumber: o.codeNumber || null,
        jerseyType: o.jerseyType,
        price: Number(o.price),
      })),
    };

    setSubmitting(true);
    try {
      let res;
      if (isEditing) {
        res = await axios.put(`${BASE_URL}/bills/${editingBill.id}`, payload);
      } else {
        res = await axios.post(`${BASE_URL}/bills`, payload);
      }

      setSuccessMessage(
        isEditing ? "بل با موفقیت به‌روزرسانی شد" : "بل با موفقیت ثبت شد"
      );
      if (!isEditing) resetForm();
      onSuccess?.(res.data);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          "خطا در ذخیره بل"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden print:p-0">
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slideDown">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FaFileInvoiceDollar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditing
                  ? `ویرایش بل #${editingBill.id}`
                  : "افزودن بل جدید"}
              </h2>
              <p className="text-sm text-white/80">
                {isEditing
                  ? "ویرایش اطلاعات مشتری و سفارش‌ها"
                  : "اطلاعات مشتری و سفارش‌ها را وارد کنید"}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="بستن"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* -------- Customer Section -------- */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FaUser className="text-primary" />
              <h3 className="font-semibold text-gray-800">اطلاعات مشتری</h3>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  updateField("customerType", "temporary");
                  updateField("customer", "");
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                  form.customerType === "temporary"
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                مشتری موقت
              </button>
              <button
                type="button"
                onClick={() => updateField("customerType", "permanent")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                  form.customerType === "permanent"
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                مشتری دائم
              </button>
            </div>

            {form.customerType === "permanent" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  <span className="text-red-500">*</span> انتخاب مشتری
                </label>

                <div className="flex items-stretch gap-2">
                  <select
                    value={form.customer}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cust = customers.find(
                        (c) => String(c.id) === String(id)
                      );
                      setForm((prev) => ({
                        ...prev,
                        customer: id,
                        name: cust?.fullname || "",
                        phoneNumber: cust?.phoneNumber || "",
                      }));
                    }}
                    disabled={loadingCustomers}
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition bg-white disabled:bg-gray-100"
                    required
                  >
                    <option value="">
                      {loadingCustomers
                        ? "در حال بارگذاری..."
                        : "انتخاب مشتری..."}
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.fullname}
                        {c.phoneNumber ? ` — ${c.phoneNumber}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomer((prev) => !prev);
                      setCustomerError(null);
                    }}
                    className="px-4 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition flex items-center gap-2 whitespace-nowrap font-medium"
                    title="افزودن مشتری جدید"
                  >
                    <FaUserPlus />
                    مشتری جدید
                  </button>
                </div>

                {showAddCustomer && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-primary">
                        افزودن مشتری دائم جدید
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCustomer(false);
                          setCustomerError(null);
                        }}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="بستن"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>

                    {customerError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {customerError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          <span className="text-red-500">*</span> نام کامل
                        </label>
                        <input
                          value={newCustomer.fullname}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              fullname: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          disabled={creatingCustomer}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          شماره تماس
                        </label>
                        <input
                          value={newCustomer.phoneNumber}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          dir="ltr"
                          disabled={creatingCustomer}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newCustomer.isActive}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            isActive: e.target.checked,
                          })
                        }
                        disabled={creatingCustomer}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      فعال
                    </label>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustomer({
                            fullname: "",
                            phoneNumber: "",
                            isActive: true,
                          });
                          setCustomerError(null);
                        }}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                        disabled={creatingCustomer}
                      >
                        پاک کردن
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={creatingCustomer}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                          creatingCustomer
                            ? "bg-gray-400 cursor-not-allowed text-white"
                            : "bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90"
                        }`}
                      >
                        {creatingCustomer ? (
                          <>
                            <FaSpinner className="animate-spin h-3 w-3" />
                            در حال ثبت...
                          </>
                        ) : (
                          <>
                            <FaSave />
                            ثبت مشتری
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> نام مشتری
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  disabled={form.customerType === "permanent"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  شماره تماس
                </label>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => updateField("phoneNumber", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                  dir="ltr"
                  disabled={form.customerType === "permanent"}
                />
              </div>
            </div>
          </div>

          {/* -------- Orders Section -------- */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                سفارش‌ها ({orders.length})
              </h3>
              <button
                type="button"
                onClick={addOrderRow}
                className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition text-sm font-medium flex items-center gap-1"
              >
                <FaPlus />
                افزودن سفارش
              </button>
            </div>

            <div className="space-y-4">
              {orders.map((order, index) => {
                const isCustomSize = order.size === CUSTOM_SIZE_VALUE;

                return (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700">
                        سفارش #{index + 1}
                      </div>
                      {orders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrderRow(index)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                          title="حذف سفارش"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* -------- Size -------- */}
                      <div className={isCustomSize ? "" : ""}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          سایز *
                        </label>
                        <select
                          value={order.size}
                          onChange={(e) =>
                            handleSizeChange(index, e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          required
                        >
                          <option value="">انتخاب</option>
                          {SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                          {/* 👇 custom option */}
                          <option value={CUSTOM_SIZE_VALUE}>
                            سفارشی (دوساله، سه ساله ...)
                          </option>
                        </select>

                        {/* 👇 custom size text input, only when "سفارشی" is chosen */}
                        {isCustomSize && (
                          <input
                            type="text"
                            value={order.customSize}
                            onChange={(e) =>
                              updateOrder(index, "customSize", e.target.value)
                            }
                            placeholder="مثلاً: دوساله، سه ساله"
                            className="mt-2 w-full border border-primary/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                            required
                            autoFocus
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          تعداد *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={order.quantity}
                          onChange={(e) =>
                            updateOrder(index, "quantity", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          شماره ورزشکار
                        </label>
                        <input
                          value={order.athleteNumber}
                          onChange={(e) =>
                            updateOrder(index, "athleteNumber", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          کد سفارش
                        </label>
                        <input
                          value={order.codeNumber}
                          onChange={(e) =>
                            updateOrder(index, "codeNumber", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          نوع پیراهن *
                        </label>
                        <select
                          value={order.jerseyType}
                          onChange={(e) =>
                            updateOrder(index, "jerseyType", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                          required
                        >
                          {JERSEY_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          لوگو
                        </label>
                        <input
                          value={order.logo}
                          onChange={(e) =>
                            updateOrder(index, "logo", e.target.value)
                          }
                          placeholder="URL یا نام"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          dir="ltr"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          قیمت واحد *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={order.price}
                          onChange={(e) =>
                            updateOrder(index, "price", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          جمع
                        </label>
                        <div className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-primary">
                          {(
                            (Number(order.price) || 0) *
                            (Number(order.quantity) || 0)
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------- Receipt + Summary -------- */}
          <div className="rounded-xl border border-gray-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                پرداخت‌ها (اختیاری)
              </label>
              <input
                value={receiptInput}
                onChange={(e) => setReceiptInput(e.target.value)}
                placeholder="مثال: 5000 یا 1000,2000,2000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-primary focus:border-primary transition"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-gray-500">
                مجموع پرداخت: {paid.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">مجموع</p>
                <p className="text-lg font-bold text-gray-900">
                  {billTotal.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-emerald-600 mb-1">پرداخت شده</p>
                <p className="text-lg font-bold text-emerald-700">
                  {paid.toLocaleString()}
                </p>
              </div>
              <div
                className={`rounded-xl p-4 border ${
                  remaining > 0
                    ? "bg-red-50 border-red-200"
                    : remaining < 0
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">باقی مانده</p>
                <p
                  className={`text-lg font-bold ${
                    remaining > 0
                      ? "text-red-600"
                      : remaining < 0
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {remaining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* -------- Buttons -------- */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
                disabled={submitting}
              >
                <FaTimes />
                لغو
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-3 rounded-xl font-medium shadow-md transition flex items-center gap-2 ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
              }`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <FaSave />
                  {isEditing ? "ذخیره تغییرات" : "ثبت بل و سفارش‌ها"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}