// src/components/customers/CustomerBillsFilter.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  FaFilter,
  FaDownload,
  FaSpinner,
  FaFileInvoiceDollar,
  FaTimes,
  FaPrint,
} from "react-icons/fa";
import { downloadCustomerBillsPDF } from "./CustomrsBillPDF";
import Pagination from "../../pagination/Pagination.jsx";
import PrintOrderBill from "../order/PrintOrderBill.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 10;

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* Status options */
const STATUS_OPTIONS = [
  { key: "paid", label: "پرداخت شده", cls: "text-green-700" },
  { key: "partial", label: "بخشی", cls: "text-yellow-700" },
  { key: "unpaid", label: "پرداخت نشده", cls: "text-red-700" },
];

/* ✅ Updated to handle Order statuses dynamically */
const statusBadge = (remained, recip) => {
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

export default function CustomerBillsFilter({ customer }) {  
  /* ---------- Filters ---------- */
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);

  /* ---------- Data ---------- */
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [downloading, setDownloading] = useState(false);

  /* ---------- Print ---------- */
  const [printOrderId, setPrintOrderId] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  /* ---------- Summary of current page ---------- */
  const summary = orders.reduce(
    (acc, o) => {
      acc.total += Number(o.total) || 0;
      acc.paid += Number(o.recip) || 0;
      acc.remaining += Number(o.remained) || 0;
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 }
  );

  /* ---------- Fetch with filters ---------- */
  const fetchFiltered = useCallback(
    async (p = 1) => {
      if (!customer?.id) return;
      try {
        setLoading(true);
        setError(null);

        const params = {
          customerType: "permanent",
          page: p,
          limit: LIMIT,
        };
        
        // Note: Backend getOrders doesn't filter by customerId natively in WHERE clause, 
        // so we fetch and filter locally, OR pass it if you added it to the backend.
        // For safety, we pass it as a query param.
        if (customer.id) params.customerId = customer.id;
        
        if (from) params.from = toISODate(from);
        if (to) params.to = toISODate(to);

        const res = await axios.get(`${BASE_URL}/orders`, { params });
        
        let fetchedOrders = res.data.orders || [];

        // Local filter by customer ID just in case backend doesn't support it yet
        if (customer.id) {
          fetchedOrders = fetchedOrders.filter(
            (o) => String(o.customer?.id) === String(customer.id)
          );
        }

        // Local filter by Status (since backend filter uses `remained`/`recip`, we apply it here)
        if (selectedStatuses.length > 0) {
          fetchedOrders = fetchedOrders.filter((o) => {
            const isPaid = Number(o.remained) <= 0;
            const isPartial = Number(o.recip) > 0 && Number(o.remained) > 0;
            const isUnpaid = Number(o.recip) === 0 && Number(o.remained) > 0;

            if (selectedStatuses.includes("paid") && isPaid) return true;
            if (selectedStatuses.includes("partial") && isPartial) return true;
            if (selectedStatuses.includes("unpaid") && isUnpaid) return true;
            return false;
          });
        }

        setOrders(fetchedOrders);
        setPage(res.data.pagination?.currentPage || p);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(fetchedOrders.length);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "خطا در دریافت سفارشات");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [customer?.id, selectedStatuses, from, to]
  );

  useEffect(() => {
    fetchFiltered(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, selectedStatuses, from, to]);

  /* ---------- Handlers ---------- */
  const toggleStatus = (key) => {
    setSelectedStatuses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setFrom(null);
    setTo(null);
  };

  /* ---------- Print ---------- */
  const handlePrint = (order, e) => {
    e?.stopPropagation();
    setPrintOrderId(order.id);    
    setPrintOpen(true);
  };

  /* ---------- Download ---------- */
  const handleDownload = async () => {
    try {
      setDownloading(true);

      const params = {
        customerType: "permanent",
        customerId: customer.id,
        page: 1,
        limit: 10000,
      };
      if (from) params.from = toISODate(from);
      if (to) params.to = toISODate(to);

      const res = await axios.get(`${BASE_URL}/orders`, { params });
      let allOrders = res.data.orders || [];

      // Apply local filters for download
      if (customer.id) {
        allOrders = allOrders.filter((o) => String(o.customer?.id) === String(customer.id));
      }
      if (selectedStatuses.length > 0) {
        allOrders = allOrders.filter((o) => {
          const isPaid = Number(o.remained) <= 0;
          const isPartial = Number(o.recip) > 0 && Number(o.remained) > 0;
          const isUnpaid = Number(o.recip) === 0 && Number(o.remained) > 0;
          if (selectedStatuses.includes("paid") && isPaid) return true;
          if (selectedStatuses.includes("partial") && isPartial) return true;
          if (selectedStatuses.includes("unpaid") && isUnpaid) return true;
          return false;
        });
      }

      if (allOrders.length === 0) {
        alert("هیچ سفارشی برای دانلود وجود ندارد");
        return;
      }

      const fullSummary = allOrders.reduce(
        (acc, o) => {
          acc.total += Number(o.total) || 0;
          acc.paid += Number(o.recip) || 0;
          acc.remaining += Number(o.remained) || 0;
          return acc;
        },
        { total: 0, paid: 0, remaining: 0 }
      );

      // Note: You may need to update `downloadCustomerBillsPDF` to handle `orders` instead of `bills`
      downloadCustomerBillsPDF({
        customer,
        orders: allOrders,
        filters: {
          status: selectedStatuses.join(",") || null,
          from: from ? toISODate(from) : null,
          to: to ? toISODate(to) : null,
        },
        summary: fullSummary,
      });
    } catch (err) {
      alert("خطا در دریافت داده برای دانلود");
    } finally {
      setDownloading(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaFileInvoiceDollar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">سفارشات {customer.fullname}</h3>
            <p className="text-xs text-white/80">{totalItems} سفارش با فیلتر فعلی</p>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || orders.length === 0}
          className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
            downloading || orders.length === 0
              ? "bg-white/20 text-white/60 cursor-not-allowed"
              : "bg-white text-primary hover:bg-white/90"
          }`}
          title="دانلود گزارش PDF"
        >
          {downloading ? (
            <><FaSpinner className="animate-spin" /> در حال آماده‌سازی...</>
          ) : (
            <><FaDownload /> دانلود PDF</>
          )}
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
          <FaFilter className="text-primary text-xs" /> فیلترها
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = selectedStatuses.includes(opt.key);
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleStatus(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? "bg-primary text-white border-primary"
                    : `bg-white ${opt.cls} border-gray-300 hover:border-primary`
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {(selectedStatuses.length > 0 || from || to) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition flex items-center gap-1"
            >
              <FaTimes className="text-[10px]" /> پاک کردن
            </button>
          )}
        </div>

        {/* ✅ Shamsi date range */}
        <div className="flex flex-wrap items-center gap-3">
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
              placeholder="1405/07/01"
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
              placeholder="1405/07/14"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {!loading && orders.length > 0 && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-gray-100">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500 mb-1">مجموع (صفحه)</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600 mb-1">پرداخت شده</p>
            <p className="text-base font-bold text-emerald-700">{formatCurrency(summary.paid)}</p>
          </div>
          <div className={`rounded-xl border p-3 ${summary.remaining > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
            <p className="text-xs text-gray-500 mb-1">باقی مانده</p>
            <p className={`text-base font-bold ${summary.remaining > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(summary.remaining)}
            </p>
          </div>
        </div>
      )}

      {/* Errors */}
      {error && <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Orders list */}
      <div className="p-4">
        {loading ? (
          <div className="py-12 text-center">
            <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
            <p className="text-gray-600">در حال بارگذاری...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <FaFileInvoiceDollar className="text-primary text-2xl" />
            </div>
            <p className="text-gray-500">هیچ سفارشی با این فیلترها یافت نشد</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">مجموع</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">پرداخت شده</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">باقی</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">وضعیت</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">تاریخ</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-primary/5 transition">
                    <td className="px-3 py-3 text-sm font-semibold text-primary">#{o.id}</td>
                    <td className="px-3 py-3 text-sm text-gray-800">{formatCurrency(o.total)}</td>
                    <td className="px-3 py-3 text-sm text-emerald-700 font-medium">{formatCurrency(o.recip)}</td>
                    <td className={`px-3 py-3 text-sm font-semibold ${Number(o.remained) > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(o.remained)}
                    </td>
                    <td className="px-3 py-3">{statusBadge(o.remained, o.recip)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => handlePrint(o, e)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                        title="چاپ سفارش"
                      >
                        <FaPrint size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 mt-3">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchFiltered} />
        </div>
      </div>

      {/* Print modal */}
      <PrintOrderBill
        isOpen={printOpen}
        onClose={() => {
          setPrintOpen(false);
          setPrintOrderId(null);
        }}
        orderId={printOrderId}
      />
    </div>
  );
}