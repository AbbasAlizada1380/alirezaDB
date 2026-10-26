// src/components/bills/BillsTable.jsx
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import moment from "moment-jalaali";
import {
  FaEye,
  FaTrash,
  FaSpinner,
  FaEdit,
  FaPrint,
  FaCalendarAlt,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import Pagination from "../../../pagination/Pagination.jsx";
import PrintOrderBill from "../PrintOrderBill.jsx";
import BillsHeader from "./AddBillsHeader";
import SearchBillsBar from "./SearchBillsBar";
import BillsFiltersPanel from "./BillsFiltersPanel";
import BillsSummaryTiles from "./BillsSummaryTiles";
import BillDetail from "./BillDetail";
import {
  fetchAllFilteredBills,
  downloadBillsPDF,
  downloadBillsCSV,
  downloadBillsExcel,
} from "./utils/billsDownload";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 20;

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ---------- Helpers ---------- */
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
        دائم
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      موقت
    </span>
  );
};

/* =========================================================
   Main
   ========================================================= */
export default function BillsTable({ refreshKey = 0, onEdit }) {
  /* ---------- Data ---------- */
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /* ---------- Detail ---------- */
  const [selectedBill, setSelectedBill] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ---------- Print ---------- */
  const [printBillId, setPrintBillId] = useState(null);

  /* ---------- Filters ---------- */
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* ---------- Download state ---------- */
  const [downloading, setDownloading] = useState({
    pdf: false,
    csv: false,
    excel: false,
  });

  /* ---------- Derived ---------- */
  const hasRange = Boolean(from && to);
  const hasSearch = Boolean(searchQuery.trim());
  const hasAnyFilter = hasRange || hasSearch;

  const summary = bills.reduce(
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

  /* =========================================================
     Fetch
     ========================================================= */
  const fetchBills = useCallback(
    async (p = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = { page: p, limit: LIMIT };
        if (from) params.from = toISODate(from);
        if (to) params.to = toISODate(to);
        if (searchQuery.trim()) params.q = searchQuery.trim();

        const res = await axios.get(`${BASE_URL}/bills`, { params });
        setBills(res.data.bills || []);
        setPage(res.data.pagination?.currentPage || p);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.totalItems || 0);
      } catch (err) {
        setError(
          err?.response?.data?.message || err.message || "خطا در دریافت بل‌ها"
        );
        setBills([]);
      } finally {
        setLoading(false);
      }
    },
    [from, to, searchQuery]
  );

  useEffect(() => {
    fetchBills(1);
  }, [fetchBills, refreshKey]);

  /* ---------- Filter handlers ---------- */
  const handleApply = () => {
    setPage(1);
    fetchBills(1);
  };

  const handleClearRange = () => {
    setFrom(null);
    setTo(null);
    setPage(1);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleClearAll = () => {
    setFrom(null);
    setTo(null);
    setSearchQuery("");
    setPage(1);
  };

  const handleRefresh = () => {
    fetchBills(page);
  };

  /* ---------- Download ---------- */
  const handleDownload = async (format) => {
    setDownloading((s) => ({ ...s, [format]: true }));
    try {
      const allBills = await fetchAllFilteredBills({
        from,
        to,
        q: searchQuery,
      });

      if (!allBills.length) {
        alert("هیچ بلی برای دانلود وجود ندارد");
        return;
      }

      if (format === "pdf") downloadBillsPDF(allBills, from, to, searchQuery);
      if (format === "csv") downloadBillsCSV(allBills, from, to, searchQuery);
      if (format === "excel")
        await downloadBillsExcel(allBills, from, to, searchQuery);
    } catch (err) {
      console.error("Download error:", err);
      alert("خطا در دانلود فایل");
    } finally {
      setDownloading((s) => ({ ...s, [format]: false }));
    }
  };

  /* ---------- Row actions ---------- */
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

  /* =========================================================
     Render
     ========================================================= */
  return (
    <div className="space-y-4 mt-6">
      {/* ---------- Header ---------- */}
      <BillsHeader
        totalItems={totalItems}
        hasRange={hasRange}
        loading={loading}
        downloading={downloading}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
      />

      {/* ---------- Search Bar ---------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
        <SearchBillsBar
          onSearch={handleSearch}
          initialValue={searchQuery}
        />
      </div>

      {/* ---------- Filters Panel ---------- */}
      {showFilters && (
        <BillsFiltersPanel
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onApply={handleApply}
          onClear={handleClearRange}
          loading={loading}
        />
      )}

      {/* ---------- Active Search Chip ---------- */}
      {hasSearch && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            جستجو: {searchQuery}
            <button
              onClick={() => handleSearch("")}
              className="hover:bg-primary/20 rounded-full p-0.5"
              title="پاک کردن جستجو"
            >
              ✕
            </button>
          </span>
          {hasRange && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
              بازه: {formatDate(from)} تا {formatDate(to)}
              <button
                onClick={handleClearRange}
                className="hover:bg-gray-200 rounded-full p-0.5"
                title="پاک کردن بازه"
              >
                ✕
              </button>
            </span>
          )}
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            پاک کردن همه فیلترها
          </button>
        </div>
      )}

      {/* ---------- Summary Tiles (only when range is applied) ---------- */}
      {hasRange && !loading && bills.length > 0 && (
        <BillsSummaryTiles summary={summary} />
      )}

      {/* ---------- Error ---------- */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ---------- Grid: list + detail ---------- */}
      <div
        className={`grid gap-4 ${selectedBill ? "lg:grid-cols-5" : "grid-cols-1"
          }`}
      >
        <div className={selectedBill ? "lg:col-span-3" : ""}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {/* 👇 live table — PDF is generated from THIS node */}
              <table
                className="min-w-full divide-y divide-gray-200"
              >
                <thead className="bg-gradient-to-r from-primary to-primary/80">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      مشتری
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      نوع
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      مجموع
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      باقی
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      وضعیت
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase">
                      تاریخ
                    </th>
                    <th
                      data-pdf-hide
                      className="px-4 py-3 text-right text-xs font-semibold text-white uppercase print:hidden"
                    >
                      عملیات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {loading ? (
                    <tr data-placeholder="1">
                      <td colSpan="8" className="py-12 text-center">
                        <FaSpinner className="text-3xl text-primary animate-spin mx-auto mb-3" />
                        <p className="text-gray-600">در حال بارگذاری...</p>
                      </td>
                    </tr>
                  ) : bills.length === 0 ? (
                    <tr data-placeholder="1">
                      <td colSpan="8" className="py-12 text-center">
                        <div className="w-16 h-16 mb-3 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          {hasAnyFilter ? (
                            <FaCalendarAlt className="text-primary text-2xl" />
                          ) : (
                            <FaFileInvoiceDollar className="text-primary text-2xl" />
                          )}
                        </div>
                        <p className="text-gray-500">
                          {hasSearch
                            ? `هیچ بلی با «${searchQuery}» یافت نشد`
                            : hasRange
                              ? "هیچ بلی در این بازه یافت نشد"
                              : "هیچ بلی ثبت نشده"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    bills.map((bill) => {
                      const isSelected = selectedBill?.id === bill.id;
                      return (
                        <tr
                          key={bill.id}
                          className={`cursor-pointer transition ${isSelected
                              ? "bg-primary/10 hover:bg-primary/15"
                              : "hover:bg-gray-50"
                            }`}
                          onClick={() => openDetail(bill.id)}
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-primary">
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
                            className={`px-4 py-3 text-sm font-semibold ${Number(bill.remaind) > 0
                                ? "text-red-600"
                                : "text-green-600"
                              }`}
                          >
                            {formatCurrency(bill.remaind)}
                          </td>
                          <td className="px-4 py-3">
                            {statusBadge(bill.status)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(bill.createdAt)}
                          </td>
                          <td data-pdf-hide className="px-4 py-3">
                            <div className="flex items-center gap-2">
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => fetchBills(p)}
            />
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

      {/* Print modal — generates PDF from the live table above */}
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