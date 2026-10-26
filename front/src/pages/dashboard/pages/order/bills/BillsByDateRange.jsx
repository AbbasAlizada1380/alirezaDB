// src/components/bills/BillsByDateRange.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  FaFileInvoiceDollar,
  FaEye,
  FaTrash,
  FaTimes,
  FaSpinner,
  FaUser,
  FaPhone,
  FaClock,
  FaEdit,
  FaPrint,
  FaCalendarAlt,
  FaFilter,
  FaSync,
} from "react-icons/fa";
import Pagination from "../../../pagination/Pagination.jsx";
import PrintOrderBill from "../PrintOrderBill.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 20;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* -------------------------
   Helpers
------------------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

/* ✅ Hijri Shamsi date formatter */
const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    return moment(dateString).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

/* ✅ Convert JS Date → "YYYY-MM-DD" for API */
const toISODate = (d) => {
  if (!d) return "";
  try {
    const m = moment(d);
    if (!m.isValid()) return "";
    return m.format("YYYY-MM-DD");
  } catch {
    return "";
  }
};

const statusBadge = (status) => {
  const map = {
    paid: { label: "پرداخت شده", cls: "bg-green-100 text-green-800" },
    partial: { label: "بخشی", cls: "bg-yellow-100 text-yellow-800" },
    unpaid: { label: "پرداخت نشده", cls: "bg-red-100 text-red-800" },
  };
  const s = map[status] || map.unpaid;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
};

const customerTypeBadge = (type) => {
  if (type === "permanent") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <FaUser className="text-[10px]" />
        دائم
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <FaClock className="text-[10px]" />
      موقت
    </span>
  );
};

/* =========================================================
   Bill Detail panel
   ========================================================= */
function BillDetail({ bill, onClose, onDelete, onPrint }) {
  if (!bill) return null;

  const paid = Array.isArray(bill.receipt)
    ? bill.receipt.reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaFileInvoiceDollar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">بل #{bill.id}</h3>
            <p className="text-xs text-white/80">{formatDate(bill.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPrint?.(bill)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="چاپ"
          >
            <FaPrint />
          </button>
          <button
            onClick={() => onDelete(bill.id)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="حذف"
          >
            <FaTrash />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="بستن"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer block */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              اطلاعات مشتری
            </span>
            {customerTypeBadge(bill.customerType)}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FaUser className="text-primary text-xs" />
              <span className="font-medium">{bill.name || "—"}</span>
            </div>
            {bill.phoneNumber && (
              <div className="flex items-center gap-2 text-gray-600" dir="ltr">
                <FaPhone className="text-primary text-xs" />
                <span>{bill.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-500 mb-1">مجموع</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(bill.total)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] text-emerald-600 mb-1">پرداخت شده</p>
            <p className="text-sm font-bold text-emerald-700">
              {formatCurrency(paid)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-3 ${
              Number(bill.remaind) > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <p className="text-[11px] text-gray-500 mb-1">باقی مانده</p>
            <p
              className={`text-sm font-bold ${
                Number(bill.remaind) > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(bill.remaind)}
            </p>
          </div>
        </div>

        {/* Receipts */}
        {Array.isArray(bill.receipt) && bill.receipt.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              پرداخت‌ها ({bill.receipt.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {bill.receipt.map((amount, i) => (
                <span
                  key={i}
                  className="inline-block font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1"
                  dir="ltr"
                >
                  {Number(amount).toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700">
              سفارش‌ها ({bill.orders?.length || 0})
            </p>
            {statusBadge(bill.status)}
          </div>

          {bill.orders && bill.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-right font-medium text-gray-600">سایز</th>
                    <th className="p-2 text-right font-medium text-gray-600">تعداد</th>
                    <th className="p-2 text-right font-medium text-gray-600">شماره</th>
                    <th className="p-2 text-right font-medium text-gray-600">نوع</th>
                    <th className="p-2 text-right font-medium text-gray-600">قیمت</th>
                    <th className="p-2 text-right font-medium text-gray-600">جمع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bill.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-800 font-medium">{o.size}</td>
                      <td className="p-2 text-gray-700">{o.quantity}</td>
                      <td className="p-2 text-gray-700">
                        {o.athleteNumber || "—"}
                      </td>
                      <td className="p-2 text-gray-700">{o.jerseyType}</td>
                      <td className="p-2 text-gray-700">
                        {Number(o.price).toLocaleString()}
                      </td>
                      <td className="p-2 font-semibold text-primary">
                        {Number(o.total || 0) > 0
                          ? Number(o.total).toLocaleString()
                          : (Number(o.price) * Number(o.quantity)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">
              سفارشی ثبت نشده
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Main Component
   ========================================================= */
export default function BillsByDateRange({
  onEdit,
  defaultFrom = null,
  defaultTo = null,
}) {
  /* ---------- Data ---------- */
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ---------- Summary ---------- */
  const [summary, setSummary] = useState({
    total: 0,
    paid: 0,
    remaining: 0,
  });

  /* ---------- Filters ---------- */
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [showFilters, setShowFilters] = useState(true);

  /* ---------- Detail panel ---------- */
  const [selectedBill, setSelectedBill] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ---------- Print ---------- */
  const [printBillId, setPrintBillId] = useState(null);

  /* ---------------- Fetch bills in range ---------------- */
  const fetchBills = useCallback(
    async (p = 1) => {
      if (!from || !to) {
        setBills([]);
        setTotalItems(0);
        setTotalPages(1);
        setSummary({ total: 0, paid: 0, remaining: 0 });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${BASE_URL}/bills`, {
          params: {
            from: toISODate(from),
            to: toISODate(to),
            page: p,
            limit: LIMIT,
          },
        });

        const list = res.data.bills || [];
        setBills(list);
        setPage(res.data.pagination?.currentPage || p);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.totalItems || 0);

        /* Compute summary from the current page's bills */
        const computed = list.reduce(
          (acc, b) => {
            const total = Number(b.total || 0);
            const paid = Array.isArray(b.receipt)
              ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
              : 0;
            acc.total += total;
            acc.paid += paid;
            acc.remaining += Number(b.remaind ?? total - paid);
            return acc;
          },
          { total: 0, paid: 0, remaining: 0 }
        );
        setSummary(computed);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "خطا در دریافت بل‌ها"
        );
        setBills([]);
        setSummary({ total: 0, paid: 0, remaining: 0 });
      } finally {
        setLoading(false);
      }
    },
    [from, to]
  );

  /* ✅ Fetch when the range changes */
  useEffect(() => {
    fetchBills(1);
  }, [fetchBills]);

  /* ---------------- Handlers ---------------- */
  const handleApply = () => {
    setPage(1);
    fetchBills(1);
  };

  const handleReset = () => {
    setFrom(null);
    setTo(null);
    setBills([]);
    setTotalItems(0);
    setTotalPages(1);
    setSummary({ total: 0, paid: 0, remaining: 0 });
  };

  const handleRefresh = () => {
    fetchBills(page);
  };

  const handleEditClick = async (billId, e) => {
    e?.stopPropagation();
    try {
      const res = await axios.get(`${BASE_URL}/bills/${billId}`);
      onEdit?.(res.data);
    } catch (err) {
      alert("خطا در دریافت اطلاعات بل");
    }
  };

  const handlePrintClick = (billOrId, e) => {
    e?.stopPropagation();
    const id = typeof billOrId === "object" ? billOrId.id : billOrId;
    setPrintBillId(id);
  };

  const openDetail = async (billId) => {
    if (selectedBill?.id === billId) {
      setSelectedBill(null);
      return;
    }
    try {
      setLoadingDetail(true);
      const res = await axios.get(`${BASE_URL}/bills/${billId}`);
      setSelectedBill(res.data);
    } catch (err) {
      setError("خطا در دریافت جزئیات بل");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("حذف این بل و جدا کردن سفارش‌های آن؟")) return;
    try {
      await axios.delete(`${BASE_URL}/bills/${id}`);
      if (selectedBill?.id === id) setSelectedBill(null);
      fetchBills(page);
    } catch (err) {
      alert("خطا در حذف بل");
    }
  };

  const hasRange = Boolean(from && to);

  /* =========================================================
     Render
     ========================================================= */
  return (
    <div className="space-y-4">
      {/* ============ Filter Bar ============ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/15 rounded-xl">
              <FaCalendarAlt className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                بل‌های بازه تاریخی
              </h3>
              <p className="text-[11px] md:text-xs text-gray-500">
                {hasRange
                  ? `${totalItems} بل در این بازه`
                  : "بازه تاریخی را انتخاب کنید"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                showFilters
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaFilter className="text-xs" />
              فیلترها
            </button>
            <button
              onClick={handleRefresh}
              disabled={!hasRange || loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSync className={loading ? "animate-spin" : ""} />
              بروزرسانی
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-gray-100">
            {/* From */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">
                از تاریخ
              </label>
              <DatePicker
                value={from}
                onChange={(d) => setFrom(d?.toDate?.() || null)}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                maxDate={to ? to : undefined}
                format="YYYY/MM/DD"
                editable={false}
                inputClass="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
                placeholder="1405/07/01"
              />
            </div>

            {/* To */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">
                تا تاریخ
              </label>
              <DatePicker
                value={to}
                onChange={(d) => setTo(d?.toDate?.() || null)}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                minDate={from ? from : undefined}
                format="YYYY/MM/DD"
                editable={false}
                inputClass="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
                placeholder="1405/07/14"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleApply}
                disabled={!from || !to || loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaFilter />
                )}
                اعمال
              </button>
              {hasRange && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <FaTimes className="text-[10px]" />
                  پاک کردن
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ Summary Tiles (only when range is applied) ============ */}
      {hasRange && !loading && bills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">مجموع (صفحه)</p>
            <p className="text-base md:text-lg font-bold text-gray-900">
              {formatCurrency(summary.total)}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-600 mb-1">پرداخت شده</p>
            <p className="text-base md:text-lg font-bold text-emerald-700">
              {formatCurrency(summary.paid)}
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              summary.remaining > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <p className="text-xs text-gray-600 mb-1">باقی مانده</p>
            <p
              className={`text-base md:text-lg font-bold ${
                summary.remaining > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(summary.remaining)}
            </p>
          </div>
        </div>
      )}

      {/* ============ Error ============ */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ============ Grid: table + detail ============ */}
      <div
        className={`grid gap-4 ${
          selectedBill ? "lg:grid-cols-5" : "grid-cols-1"
        }`}
      >
        {/* Bills list */}
        <div className={selectedBill ? "lg:col-span-3" : ""}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {!hasRange ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <FaCalendarAlt className="text-primary text-2xl" />
                </div>
                <p className="text-gray-500 text-sm">
                  بازه تاریخی را انتخاب و «اعمال» کنید
                </p>
              </div>
            ) : loading ? (
              <div className="py-16 text-center">
                <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                <p className="text-gray-600 text-sm">در حال بارگذاری...</p>
              </div>
            ) : bills.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaFileInvoiceDollar className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 text-sm">
                  هیچ بلی در این بازه ثبت نشده
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-primary to-primary/80">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">#</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">مشتری</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">نوع</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">مجموع</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">باقی</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">وضعیت</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">تاریخ</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase print:hidden">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {bills.map((bill) => {
                        const isSelected = selectedBill?.id === bill.id;
                        return (
                          <tr
                            key={bill.id}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? "bg-primary/10 hover:bg-primary/15"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => openDetail(bill.id)}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-primary whitespace-nowrap">
                              #{bill.id}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {bill.name}
                              </div>
                              {bill.phoneNumber && (
                                <div className="text-xs text-gray-500" dir="ltr">
                                  {bill.phoneNumber}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {customerTypeBadge(bill.customerType)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800">
                              {formatCurrency(bill.total)}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm font-semibold ${
                                Number(bill.remaind) > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatCurrency(bill.remaind)}
                            </td>
                            <td className="px-4 py-3">{statusBadge(bill.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {formatDate(bill.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 md:gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetail(bill.id);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                                  title="مشاهده"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  onClick={(e) => handleEditClick(bill.id, e)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                                  title="ویرایش"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={(e) => handlePrintClick(bill, e)}
                                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                  title="چاپ"
                                >
                                  <FaPrint />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(bill.id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="حذف"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => fetchBills(p)}
                />
              </>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedBill && (
          <div className="lg:col-span-2">
            {loadingDetail ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                <p className="text-gray-600">در حال بارگذاری جزئیات...</p>
              </div>
            ) : (
              <BillDetail
                bill={selectedBill}
                onClose={() => setSelectedBill(null)}
                onDelete={handleDelete}
                onPrint={handlePrintClick}
              />
            )}
          </div>
        )}
      </div>

      {/* Print modal */}
      {printBillId && (
        <PrintOrderBill
          isOpen={!!printBillId}
          onClose={() => setPrintBillId(null)}
          orderId={printBillId}
        />
      )}
    </div>
  );
}