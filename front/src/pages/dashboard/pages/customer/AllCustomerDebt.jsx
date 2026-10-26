// src/components/bills/AllCustomerDebt.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  FaUsers,
  FaUserClock,
  FaFilter,
  FaDownload,
  FaSpinner,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";
import { downloadAllCustomerDebtPDF } from "./downloadAllCustomerDebtPDF";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------- helpers ---------- */
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

/* ✅ Convert JS Date or ISO string → "YYYY-MM-DD" (for API params) */
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
  if (status === "partial") {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
        بخشی
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
      پرداخت نشده
    </span>
  );
};

/* =========================================================
   Helpers to Group Orders by Customer
   ========================================================= */
const groupPermanentOrders = (orders) => {
  const grouped = {};

  orders.forEach((order) => {
    if (Number(order.remained) <= 0) return; // Only unpaid/partial

    // Use customer ID if available, otherwise fallback to name
    const cId = order.customer?.id || order.customer?.name || "unknown";
    
    if (!grouped[cId]) {
      grouped[cId] = {
        key: `p-${cId}`,
        type: "permanent",
        customerId: cId,
        name: order.customer?.name || "نامشخص",
        phoneNumber: order.customer?.phone_number || "—",
        totalAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
        orders: [],
        unpaidCount: 0,
        partialCount: 0,
        latestAt: order.createdAt,
      };
    }

    const e = grouped[cId];
    e.totalAmount += Number(order.total || 0);
    e.totalPaid += Number(order.recip || 0);
    e.totalRemaining += Number(order.remained || 0);
    e.orders.push(order);
    
    // Status counts
    if (Number(order.recip) === 0) e.unpaidCount += 1;
    else if (Number(order.remained) > 0) e.partialCount += 1;

    // Latest date
    if (new Date(order.createdAt) > new Date(e.latestAt)) {
      e.latestAt = order.createdAt;
    }
  });

  return Object.values(grouped);
};

const groupTemporaryOrders = (orders) => {
  return orders
    .filter((order) => Number(order.remained) > 0) // ✅ Only keep unpaid/partial
    .map((order) => ({
      key: `t-${order.id}`,
      type: "temporary",
      orderId: order.id,
      name: order.customer?.name || "نامشخص",
      phoneNumber: order.customer?.phone_number || "—",
      totalAmount: Number(order.total || 0),
      totalPaid: Number(order.recip || 0),
      totalRemaining: Number(order.remained || 0),
      unpaidCount: Number(order.recip) === 0 ? 1 : 0,
      partialCount: Number(order.recip) > 0 && Number(order.remained) > 0 ? 1 : 0,
      latestAt: order.createdAt,
    }));
};

/* =========================================================
   One debt table (Handles both Permanent & Temporary)
   ========================================================= */
function DebtTable({ title, icon, rows, type, accent }) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.amount += r.totalAmount;
      acc.paid += r.totalPaid;
      acc.remaining += r.totalRemaining;
      // Permanent has `orders` array, Temporary has 1 order per row
      acc.orders += r.orders ? r.orders.length : 1; 
      return acc;
    },
    { amount: 0, paid: 0, remaining: 0, orders: 0 }
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Table header */}
      <div
        className={`bg-gradient-to-r ${accent} text-white p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">{icon}</div>
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-xs text-white/80">
              {rows.length} {type === "permanent" ? "مشتری" : "سفارش"} • {totals.orders} بدهی
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-white/80">مجموع باقی‌مانده</div>
          <div className="font-bold text-base">
            {formatCurrency(totals.remaining)}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <FaCheckCircle className="text-primary text-xl" />
          </div>
          <p className="text-gray-500 text-sm">هیچ بدهی ثبت نشده است</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  {type === "permanent" ? "مشتری" : "سفارش #"}
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  شماره تماس
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  تعداد بدهی
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  مجموع
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  پرداخت شده
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  باقی مانده
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                  وضعیت
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-primary/5 transition">
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {type === "permanent" ? r.name : `#${r.orderId} - ${r.name}`}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      آخرین تاریخ: {formatDate(r.latestAt)}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700" dir="ltr">
                    {r.phoneNumber || "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700">
                    {r.orders ? r.orders.length : 1}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-800">
                    {formatCurrency(r.totalAmount)}
                  </td>
                  <td className="px-3 py-3 text-sm text-emerald-700 font-medium">
                    {formatCurrency(r.totalPaid)}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-red-600">
                    {formatCurrency(r.totalRemaining)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.unpaidCount > 0 && statusBadge("unpaid")}
                      {r.partialCount > 0 && statusBadge("partial")}
                      {r.unpaidCount > 1 && (
                        <span className="text-[10px] text-gray-500 ml-1">×{r.unpaidCount}</span>
                      )}
                      {r.partialCount > 1 && (
                        <span className="text-[10px] text-gray-500 ml-1">×{r.partialCount}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Main Component
   ========================================================= */
export default function AllCustomerDebt({ refreshKey = 0 }) {
  const [permanent, setPermanent] = useState([]);
  const [temporary, setTemporary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  /* ✅ Filter state */
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  /* ---------- Fetch both sets ---------- */
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateParams = {};
      if (from) dateParams.from = toISODate(from);
      if (to) dateParams.to = toISODate(to);

      // ✅ Fetch both Permanent and Temporary using the SAME endpoint
      const [permRes, tempRes] = await Promise.all([
        axios.get(`${BASE_URL}/orders`, {
          params: { customerType: "permanent", page: 1, limit: 10000, ...dateParams },
        }),
        axios.get(`${BASE_URL}/orders`, {
          params: { customerType: "temporary", page: 1, limit: 10000, ...dateParams },
        }),
      ]);

      const permOrders = permRes.data.orders || [];
      const tempOrders = tempRes.data.orders || [];

      // Filter and group locally
      setPermanent(groupPermanentOrders(permOrders));
      setTemporary(groupTemporaryOrders(tempOrders));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "خطا در دریافت بدهی مشتریان"
      );
      setPermanent([]);
      setTemporary([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, refreshKey]);

  /* ---------- Grand totals ---------- */
  const grandTotals = [...permanent, ...temporary].reduce(
    (acc, r) => {
      acc.amount += r.totalAmount;
      acc.paid += r.totalPaid;
      acc.remaining += r.totalRemaining;
      acc.orders += (r.orders ? r.orders.length : 1);
      acc.customers += (r.customerId ? 1 : 0); // Only count permanent customers
      return acc;
    },
    { amount: 0, paid: 0, remaining: 0, orders: 0, customers: 0 }
  );

  /* ---------- PDF ---------- */
  const handleDownload = () => {
    if (permanent.length === 0 && temporary.length === 0) {
      alert("هیچ بدهی برای دانلود وجود ندارد");
      return;
    }
    try {
      setDownloading(true);
      downloadAllCustomerDebtPDF({
        permanent,
        temporary,
        grandTotals,
        filters: {
          from: from ? toISODate(from) : null,
          to: to ? toISODate(to) : null,
        },
      });
    } catch (err) {
      alert("خطا در آماده‌سازی گزارش");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaExclamationTriangle className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">بدهی همه مشتریان</h2>
            <p className="text-xs text-gray-500">
              {permanent.length} مشتری دائمی • {temporary.length} سفارش موقت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              showFilters ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FaFilter className="text-xs" /> فیلتر تاریخ
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading || (permanent.length === 0 && temporary.length === 0)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              downloading || (permanent.length === 0 && temporary.length === 0)
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white"
            }`}
          >
            {downloading ? (
              <><FaSpinner className="animate-spin" /> در حال آماده‌سازی...</>
            ) : (
              <><FaDownload /> دانلود PDF</>
            )}
          </button>
        </div>
      </div>

      {/* ✅ Shamsi Filter Bar */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">از تاریخ</label>
            <DatePicker
              value={from}
              onChange={(d) => setFrom(d?.toDate?.() || null)}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              maxDate={to ? to : undefined}
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
              placeholder="1404/07/01"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">تا تاریخ</label>
            <DatePicker
              value={to}
              onChange={(d) => setTo(d?.toDate?.() || null)}
              calendar={persian}
              locale={persian_fa}
              calendarPosition="bottom-right"
              minDate={from ? from : undefined}
              format="YYYY/MM/DD"
              editable={false}
              inputClass="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none w-32 text-center"
              placeholder="1404/07/14"
            />
          </div>

          {(from || to) && (
            <button
              onClick={() => { setFrom(null); setTo(null); }}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex items-center gap-1"
            >
              <FaTimes className="text-[10px]" /> پاک کردن
            </button>
          )}
        </div>
      )}

      {/* Grand summary tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">تعداد مشتری بدهکار</p>
          <p className="text-xl font-bold text-gray-900">{permanent.length}</p>
          <p className="text-[11px] text-gray-500 mt-1">{temporary.length} سفارش موقت</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700 mb-1 flex items-center gap-1">
            <FaUsers className="text-[10px]" /> بدهی مشتریان دائمی
          </p>
          <p className="text-xl font-bold text-blue-800">
            {formatCurrency(permanent.reduce((s, r) => s + Number(r.totalRemaining || 0), 0))}
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs text-yellow-700 mb-1 flex items-center gap-1">
            <FaUserClock className="text-[10px]" /> بدهی مشتریان موقت
          </p>
          <p className="text-xl font-bold text-yellow-800">
            {formatCurrency(temporary.reduce((s, r) => s + Number(r.totalRemaining || 0), 0))}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-600 mb-1 flex items-center gap-1">
            <FaExclamationTriangle className="text-[10px]" /> مجموع کل بدهی
          </p>
          <p className="text-xl font-bold text-red-700">
            {formatCurrency(grandTotals.remaining)}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading & Tables */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
          <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      ) : (
        <>
          <DebtTable
            title="مشتریان دائمی بدهکار"
            icon={<FaUsers className="h-5 w-5" />}
            rows={permanent}
            type="permanent"
            accent="from-primary to-primary/80"
          />

          <DebtTable
            title="سفارشات موقت بدهکار"
            icon={<FaUserClock className="h-5 w-5" />}
            rows={temporary}
            type="temporary"
            accent="from-primary to-primary/80"
          />
        </>
      )}
    </div>
  );
}