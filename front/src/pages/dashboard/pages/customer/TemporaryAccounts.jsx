// src/components/bills/PermanentAccounts.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  FaUserCheck,
  FaFilter,
  FaDownload,
  FaSpinner,
  FaTimes,
  FaExclamationTriangle,
  FaEdit,
  FaPrint,
  FaMoneyBillWave,
} from "react-icons/fa";
import moment from "moment-jalaali";
import Pagination from "../../pagination/Pagination.jsx";
import PrintOrderBill from "../order/PrintOrderBill.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 20;

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------------- helpers ---------------- */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

const formatDate = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const getOrderStatusBadge = (order) => {
  const isFullyPaid = Number(order.remained) <= 0;
  const isPartial = Number(order.recip) > 0 && Number(order.remained) > 0;

  if (isFullyPaid) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        پرداخت شده
      </span>
    );
  }
  if (isPartial) {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        بخشی
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      پرداخت نشده
    </span>
  );
};

/* ---------------- main component ---------------- */
export default function PermanentAccounts({ refreshKey = 0, onEdit }) {
  /* filters */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /* data */
  const [orders, setOrders] = useState([]);
  const [reportSummary, setReportSummary] = useState({
    totalOrders: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    paidCount: 0,
    unpaidCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* print */
  const [printOrderId, setPrintOrderId] = useState(null);

  /* ---------------- fetch ---------------- */
  const fetchPermanentAccounts = useCallback(
    async (p = 1) => {
      try {
        setLoading(true);
        setError(null);

        const dateParams = {};
        if (from) dateParams.from = from;
        if (to) dateParams.to = to;

        // 1. Fetch the high-level report summary (All time or date filtered)
        const reportRes = await axios.get(
          `${BASE_URL}/orders/reports/customer-type/temporary`,
          { params: dateParams }
        );
        setReportSummary(reportRes.data.summary || {});

        // 2. Fetch the paginated list of orders (filtered to unpaid/partial)
        // Note: You can add a custom query to getOrders to only return `remained > 0` if you want.
        // For now, we fetch permanent orders and paginate.
        const ordersRes = await axios.get(`${BASE_URL}/orders`, {
          params: {
            page: p,
            limit: LIMIT,
            customerType: "temporary",
            ...dateParams,
          },
        });

        setOrders(ordersRes.data.orders || []);
        setPage(ordersRes.data.pagination?.currentPage || p);
        setTotalPages(ordersRes.data.pagination?.totalPages || 1);
      } catch (err) {
        setError(
          err?.response?.data?.message || err.message || "خطا در دریافت حساب‌ها"
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [from, to]
  );

  useEffect(() => {
    fetchPermanentAccounts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, refreshKey]);

  /* ---------------- handlers ---------------- */
  const clearFilters = () => {
    setFrom("");
    setTo("");
  };

  const handleEditClick = async (orderId, e) => {
    e?.stopPropagation();
    if (!onEdit) return;

    try {
      const res = await axios.get(`${BASE_URL}/orders/${orderId}`);
      onEdit(res.data);
    } catch (err) {
      alert("خطا در دریافت اطلاعات سفارش");
    }
  };

  const handlePrintClick = (orderOrId, e) => {
    e?.stopPropagation();
    const id = typeof orderOrId === "object" ? orderOrId.id : orderOrId;
    setPrintOrderId(id);
  };

  /* ---------------- render ---------------- */
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaUserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">حساب مشتریان دائم</h3>
            <p className="text-xs text-white/80">
              مدیریت و گزارش سفارشات مشتریان دائم
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-50 border-b border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
          <FaFilter className="text-blue-600 text-xs" />
          فیلترها
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">از تاریخ</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">تا تاریخ</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 hover:bg-gray-200 transition flex items-center gap-1"
            >
              <FaTimes className="text-[10px]" />
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* ✅ Summary tiles from getCustomerTypeReport */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-gray-100">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500 mb-1">مجموع سفارشات</p>
          <p className="text-lg font-bold text-gray-900">
            {reportSummary.totalOrders || 0}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {reportSummary.paidCount || 0} پرداخت شده •{" "}
            {reportSummary.unpaidCount || 0} بدهکار
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
            <FaMoneyBillWave className="text-[10px]" />
            مجموع دریافتی
          </p>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(reportSummary.totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600 mb-1 flex items-center gap-1">
            <FaExclamationTriangle className="text-[10px]" />
            مجموع باقی مانده
          </p>
          <p className="text-lg font-bold text-red-700">
            {formatCurrency(reportSummary.totalRemaining)}
          </p>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="p-4">
        {loading ? (
          <div className="py-12 text-center">
            <FaSpinner className="text-3xl text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">در حال بارگذاری...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
              <FaUserCheck className="text-blue-600 text-2xl" />
            </div>
            <p className="text-gray-500">
              هیچ سفارشی برای مشتریان دائم وجود ندارد
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-800">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">#</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">مشتری</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">مجموع</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">پرداخت شده</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">باقی</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">وضعیت</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase">تاریخ</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-white uppercase">عملیات</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-blue-50 transition">
                    <td className="px-3 py-3 text-sm font-semibold text-blue-600">#{o.id}</td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{o.customer?.name || "—"}</td>
                    <td className="px-3 py-3 text-sm text-gray-800">{formatCurrency(o.total)}</td>
                    <td className="px-3 py-3 text-sm text-emerald-700 font-medium">{formatCurrency(o.recip)}</td>
                    <td className="px-3 py-3 text-sm font-semibold text-red-600">{formatCurrency(o.remained)}</td>
                    <td className="px-3 py-3">{getOrderStatusBadge(o)}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <button
                            onClick={(e) => handleEditClick(o.id, e)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                            title="ویرایش"
                          >
                            <FaEdit />
                          </button>
                        )}
                        <button
                          onClick={(e) => handlePrintClick(o, e)}
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="چاپ"
                        >
                          <FaPrint />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchPermanentAccounts}
        />
      </div>

      {/* -------- Print modal -------- */}
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