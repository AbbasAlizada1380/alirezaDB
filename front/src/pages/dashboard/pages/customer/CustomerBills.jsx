// src/components/customers/CustomerBills.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import {
  FaFileInvoiceDollar,
  FaTimes,
  FaSpinner,
  FaEye,
  FaUser,
  FaPhone,
  FaClock,
  FaBoxOpen,
  FaMoneyBillWave,
  FaReceipt,
  FaCheckCircle,
  FaPrint,
} from "react-icons/fa";
import CustomerReceipts from "./CustomerReceipts";
import Pagination from "../../pagination/Pagination.jsx";
import PrintOrderBill from "../order/PrintOrderBill.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 10;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------------- Formatting helpers ---------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

/* ✅ Hijri Shamsi date formatter */
const formatDate = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const statusBadge = (remained, recip, total) => {
  const isFullyPaid = Number(remained) <= 0;
  const isPartial = Number(recip) > 0 && Number(remained) > 0;

  if (isFullyPaid) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">پرداخت شده</span>;
  }
  if (isPartial) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">بخشی</span>;
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">پرداخت نشده</span>;
};

const customerTypeBadge = (type) => {
  if (type === "permanent") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <FaUser className="text-[10px]" /> دائم
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <FaClock className="text-[10px]" /> موقت
    </span>
  );
};

/* =========================================================
   Order detail panel
   ========================================================= */
function OrderDetail({ order, loading, onClose }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
        <p className="text-gray-600">در حال بارگذاری جزئیات...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
          <FaEye className="text-primary text-2xl" />
        </div>
        <p className="text-gray-500">یک سفارش را از لیست انتخاب کنید</p>
        <p className="text-gray-400 text-xs mt-1">جزئیات و اقلام آن اینجا نمایش داده می‌شود</p>
      </div>
    );
  }

  const digitalItems = order.digital || [];
  const offsetItems = order.offset || [];
  const allItems = [...digitalItems, ...offsetItems];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaFileInvoiceDollar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">سفارش #{order.id}</h3>
            <p className="text-xs text-white/80">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="بستن جزئیات">
            <FaTimes />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">اطلاعات مشتری</span>
            {customerTypeBadge(order.customerType)}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FaUser className="text-primary text-xs" />
              <span className="font-medium">{order.customer?.name || "—"}</span>
            </div>
            {order.customer?.phone_number && (
              <div className="flex items-center gap-2 text-gray-600" dir="ltr">
                <FaPhone className="text-primary text-xs" />
                <span>{order.customer.phone_number}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-500 mb-1">مجموع</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] text-emerald-600 mb-1">پرداخت شده</p>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(order.recip)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${Number(order.remained) > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <p className="text-[11px] text-gray-500 mb-1">باقی مانده</p>
            <p className={`text-sm font-bold ${Number(order.remained) > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(order.remained)}
            </p>
          </div>
        </div>

        {/* ✅ Displaying Digital and Offset Items instead of Bills */}
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-2">
              <FaBoxOpen className="text-primary" /> اقلام سفارش ({allItems.length})
            </p>
            {statusBadge(order.remained, order.recip, order.total)}
          </div>

          {allItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-right font-medium text-gray-600">نام محصول</th>
                    <th className="p-2 text-right font-medium text-gray-600">تعداد</th>
                    <th className="p-2 text-right font-medium text-gray-600">قیمت واحد</th>
                    <th className="p-2 text-right font-medium text-gray-600">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-800 font-medium">{item.name || "—"}</td>
                      <td className="p-2 text-gray-700">{item.quantity || 0}</td>
                      <td className="p-2 text-gray-700">{Number(item.price_per_unit || 0).toLocaleString()}</td>
                      <td className="p-2 font-semibold text-primary">{Number(item.money || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">هیچ محصولی ثبت نشده</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main component
   ========================================================= */
export default function CustomerBills({ customer, onClose, onPaid }) {
  const [orders, setOrders] = useState([]);
  const [reportSummary, setReportSummary] = useState({ totalOrders: 0, totalPaid: 0, totalRemaining: 0 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [receiptsKey, setReceiptsKey] = useState(0);
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [printOrderId, setPrintOrderId] = useState(null);

  /* ---------------- Payment state ---------------- */
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  /* ---------------- Fetch Orders & Report ---------------- */
  const fetchData = async (p = 1) => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch specific customer report from getCustomerTypeReport
      const reportRes = await axios.get(`${BASE_URL}/orders/reports/customer-type/permanent`, {
        params: { customerId: customer.id }
      });
      setReportSummary(reportRes.data.summary || { totalOrders: 0, totalPaid: 0, totalRemaining: 0 });

      // 2. Fetch orders list
      const ordersRes = await axios.get(`${BASE_URL}/orders`, {
        params: {
          customerType: "permanent",
          // The backend doesn't natively filter by customerId in getOrders, 
          // but since we set the customer JSON, we can rely on the report for totals.
          // (Optional: Add a `customerId` query param to getOrders if you want to filter the list)
          page: p,
          limit: LIMIT,
        },
      });

      // Filter locally if backend getOrders doesn't support customerId yet
      const filteredOrders = (ordersRes.data.orders || []).filter(
        o => String(o.customer?.id) === String(customer.id)
      );

      setOrders(filteredOrders);
      setPage(ordersRes.data.pagination?.currentPage || p);
      setTotalPages(ordersRes.data.pagination?.totalPages || 1);
      setTotalItems(filteredOrders.length);

    } catch (err) {
      setError(err?.response?.data?.message || err.message || "خطا در دریافت اطلاعات");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    setSelectedOrder(null);
    setPayAmount("");
    setPayDescription("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  /* ---------------- Open order detail ---------------- */
  const openOrderDetail = async (orderId) => {
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(null);
      return;
    }
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${BASE_URL}/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch (err) {
      setError("خطا در دریافت جزئیات سفارش");
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ---------------- Submit payment ---------------- */
  const handlePay = async (e) => {
    e.preventDefault();
    setError(null);

    const numericPayAmount = Number(payAmount) || 0;
    if (!customer?.id || numericPayAmount <= 0) {
      setError("مبلغ پرداختی باید بزرگ‌تر از صفر باشد");
      return;
    }

    setSubmitting(true);
    try {
      // ✅ Use the new payPermanentCustomer endpoint
      const res = await axios.post(`${BASE_URL}/orders/pay/permanent`, {
        customerId: customer.id,
        amount: numericPayAmount,
        description: payDescription?.trim() || null,
      });

      const data = res.data || {};
      const paidAmount = data.paid ?? numericPayAmount;

      setSuccessMessage(`پرداخت ${formatCurrency(paidAmount)} با موفقیت ثبت شد`);
      setReceiptsKey((k) => k + 1);
      setPayAmount("");
      setPayDescription("");

      await fetchData(1); // Refresh both list and report
      if (selectedOrder) {
        try {
          const refreshed = await axios.get(`${BASE_URL}/orders/${selectedOrder.id}`);
          setSelectedOrder(refreshed.data);
        } catch (e) {
          setSelectedOrder(null);
        }
      }

      onPaid?.(data);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "خطا در ثبت پرداخت");
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) return null;

  const hasSelection = Boolean(selectedOrder);
  const canPay = customer?.id && reportSummary.totalRemaining > 0;

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slideDown">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-green-100 rounded-lg transition-colors">
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-full flex-shrink-0">
              <FaFileInvoiceDollar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">سفارشات {customer.fullname}</h2>
              <p className="text-sm text-white/80">{reportSummary.totalOrders || totalItems} سفارش ثبت شده</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0" title="بستن">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Customer strip */}
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <FaUser className="text-primary text-xs" />
            <span className="font-medium">{customer.fullname}</span>
          </div>
          {customer.phoneNumber && (
            <div className="flex items-center gap-2 text-gray-600" dir="ltr">
              <FaPhone className="text-primary text-xs" />
              <span>{customer.phoneNumber}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[75vh] overflow-y-auto space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Payment bar (FIFO Allocation) */}
        {canPay && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-primary/15 rounded-lg">
                <FaMoneyBillWave className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">ثبت پرداخت برای مشتری</h3>
                <p className="text-xs text-gray-500">مبلغ به‌صورت خودکار روی قدیمی‌ترین سفارشات بدهکار اعمال می‌شود</p>
              </div>
            </div>

            <form onSubmit={handlePay} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1"><span className="text-red-500">*</span> مبلغ</label>
                  <input
                    type="number"
                    min="1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="۰"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={submitting}
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setPayAmount(String(reportSummary.totalRemaining))} className="px-2 py-1 rounded-lg text-[11px] bg-primary/10 text-primary hover:bg-primary/20 transition">
                      پرداخت کامل ({formatCurrency(reportSummary.totalRemaining)})
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
                  <input
                    type="text"
                    value={payDescription}
                    onChange={(e) => setPayDescription(e.target.value)}
                    placeholder="مثال: پرداخت نقدی در دفتر"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || Number(payAmount) <= 0}
                  className={`px-5 py-2.5 rounded-xl font-medium shadow-sm transition flex items-center gap-2 ${
                    submitting || Number(payAmount) <= 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white"
                  }`}
                >
                  {submitting ? <><FaSpinner className="animate-spin" /> در حال ثبت...</> : <><FaReceipt /> ثبت پرداخت</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary cards from getCustomerTypeReport */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-1">مجموع سفارشات</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(reportSummary.totalAmount || 0)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600 mb-1">پرداخت شده</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(reportSummary.totalPaid || 0)}</p>
            </div>
            <div className={`rounded-xl border p-3 ${reportSummary.totalRemaining > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
              <p className="text-xs text-gray-500 mb-1">باقی مانده</p>
              <p className={`text-lg font-bold ${reportSummary.totalRemaining > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(reportSummary.totalRemaining || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Receipts panel */}
        {customer?.id && <CustomerReceipts customer={customer} refreshKey={receiptsKey} compact />}

        {/* Two-column layout */}
        <div className={`grid gap-4 ${hasSelection ? "lg:grid-cols-5" : "grid-cols-1"}`}>
          <div className={hasSelection ? "lg:col-span-3" : ""}>
            {loading ? (
              <div className="py-12 text-center">
                <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                <p className="text-gray-600">در حال بارگذاری سفارشات...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaFileInvoiceDollar className="text-primary text-2xl" />
                </div>
                <p className="text-gray-500">هیچ سفارشی برای این مشتری ثبت نشده</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-primary to-primary/80">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">#</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">مجموع</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">باقی</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">وضعیت</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">تاریخ</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-white uppercase">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {orders.map((o) => {
                      const isSelected = selectedOrder?.id === o.id;
                      return (
                        <tr
                          key={o.id}
                          onClick={() => openOrderDetail(o.id)}
                          className={`cursor-pointer transition ${isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-3 text-sm font-semibold text-primary">#{o.id}</td>
                          <td className="px-3 py-3 text-sm text-gray-800">{formatCurrency(o.total)}</td>
                          <td className={`px-3 py-3 text-sm font-semibold ${Number(o.remained) > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(o.remained)}
                          </td>
                          <td className="px-3 py-3">{statusBadge(o.remained, o.recip, o.total)}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openOrderDetail(o.id); }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                                title="مشاهده جزئیات"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPrintOrderId(o.id); }}
                                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                title="چاپ"
                              >
                                <FaPrint />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-gray-200 mt-3">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchData} />
            </div>
          </div>

          <div className={hasSelection ? "lg:col-span-2" : "hidden"}>
            {hasSelection && <OrderDetail order={selectedOrder} loading={loadingDetail} onClose={() => setSelectedOrder(null)} />}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {printOrderId && (
        <PrintOrderBill
          isOpen={!!printOrderId}
          onClose={() => setPrintOrderId(null)}
          orderId={printOrderId}
        />
      )}
    </div>
  );
}