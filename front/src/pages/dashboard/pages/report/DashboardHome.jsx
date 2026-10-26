import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaMoneyBillWave,
  FaTruck,
  FaClock,
  FaCheckCircle,
  FaChartLine,
  FaCalendarAlt,
  FaSync,
  FaBoxOpen,
  FaWallet,
  FaExclamationTriangle,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaDollarSign,
  FaBoxes,
  FaHistory,
  FaTimes,
  FaInfoCircle,
  FaUsers,
  FaClipboardList,
} from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSelector } from "react-redux";
import PackageDownload from "./OrderDownload.jsx";
import RunReportDownload from "./RunReportDownload.jsx";
import ReceiptsManager from "../order/ReceiptsManager.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ============================================================
// CONSTANTS
// ============================================================

const REPORT_TYPES = [
  { value: "all", label: "همه سفارشات" },
  { value: "delivered", label: "تحویل شده" },
  { value: "pending", label: "در انتظار" },
];

// Helper to get the default dates (Start: 1405/07/01, End: Today)
const getDefaultDates = () => {
  // 1405/07/01 is equivalent to October 23, 2026 in the Gregorian calendar
  const defaultStart = new Date(2026, 9, 23); 
  const defaultEnd = new Date(); // Today
  return { start: defaultStart, end: defaultEnd };
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const LoadingState = ({ message = "در حال بارگذاری داشبورد" }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-4">
    <div className="text-center max-w-md">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-blue-100 rounded-full mx-auto mb-6"></div>
        <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-1/2 transform -translate-x-1/2"></div>
      </div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{message}</h3>
      <p className="text-gray-500">دریافت آخرین اطلاعات...</p>
    </div>
  </div>
);

const ErrorState = ({ error, onRetry, isRefreshing }) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FaExclamationTriangle className="text-red-500 text-2xl" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-3">خطا در اتصال</h3>
      <p className="text-gray-600 mb-6">{error}</p>
      <button
        onClick={onRetry}
        disabled={isRefreshing}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <FaSync className={isRefreshing ? "animate-spin" : ""} />
        {isRefreshing ? "در حال تلاش..." : "تلاش مجدد"}
      </button>
    </div>
  </div>
);

const StatCard = ({ stat, isLoading }) => {
  const Icon = stat.icon;
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div
        className={`absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b ${stat.color}`}
      />

      <div className="flex items-start justify-between mb-4">
        <div className={`${stat.bgColor} p-3 rounded-xl`}>
          <Icon className={`${stat.iconColor} text-xl`} />
        </div>
        {stat.trend && !isLoading && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              stat.trend.startsWith("+")
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {stat.trend}
          </span>
        )}
      </div>

      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{stat.title}</p>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-800 tabular-nums">
          {isLoading ? (
            <span className="inline-block w-24 h-7 bg-gray-100 rounded animate-pulse" />
          ) : (
            stat.value
          )}
        </h3>
        {stat.description && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <FaInfoCircle className="text-[10px]" />
            {stat.description}
          </p>
        )}
      </div>
    </div>
  );
};

const FilterPanel = ({
  startDate,
  endDate,
  reportType,
  setStartDate,
  setEndDate,
  setReportType,
  onApply,
  onClear,
  isLoading,
}) => (
  <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          تاریخ شروع
        </label>
        <div className="relative">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            placeholderText="انتخاب تاریخ شروع"
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={endDate || new Date()}
            isClearable
          />
          <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          تاریخ پایان
        </label>
        <div className="relative">
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            placeholderText="انتخاب تاریخ پایان"
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            maxDate={new Date()}
            isClearable
          />
          <FaCalendarAlt className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          نوع گزارش
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-sm"
        >
          {REPORT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="flex flex-wrap justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
      <button
        onClick={onClear}
        disabled={isLoading}
        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <FaTimes /> پاک کردن فیلترها
      </button>
      <button
        onClick={onApply}
        disabled={isLoading}
        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isLoading ? <FaSync className="animate-spin" /> : <FaFilter />}
        اعمال فیلترها
      </button>
    </div>
  </div>
);

const DeliveryProgress = ({ reportData, formatNumber }) => {
  const {
    totalOrdersCount = 0,
    deliveredOrdersCount = 0,
    notDeliveredOrdersCount = 0,
  } = reportData;

  const deliveryRate =
    totalOrdersCount > 0 ? (deliveredOrdersCount / totalOrdersCount) * 100 : 0;

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaTruck className="text-blue-600" />
          وضعیت تحویل سفارشات
        </h3>
        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          {deliveryRate.toFixed(1)}%
        </span>
      </div>

      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(deliveryRate, 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <FaBoxOpen /> کل سفارشات
          </div>
          <p className="text-xl font-bold text-gray-800">
            {formatNumber(totalOrdersCount)}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs mb-1">
            <FaCheckCircle /> تحویل شده
          </div>
          <p className="text-xl font-bold text-emerald-700">
            {formatNumber(deliveredOrdersCount)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
            <FaClock /> در انتظار
          </div>
          <p className="text-xl font-bold text-amber-700">
            {formatNumber(notDeliveredOrdersCount)}
          </p>
        </div>
      </div>
    </div>
  );
};

const PerformanceSummary = ({ reportData, formatNumber }) => {
  const {
    totalOrdersCount = 0,
    deliveredOrdersCount = 0,
    notDeliveredOrdersCount = 0,
    timeRange,
  } = reportData;

  const deliveryRate =
    totalOrdersCount > 0 ? (deliveredOrdersCount / totalOrdersCount) * 100 : 0;

  const formatTimeRange = (range) => {
    if (!range) return "همه";
    if (typeof range === "string") return range;
    if (typeof range === "object") {
      const { startDate, endDate, hasTimeRange } = range;
      if (!hasTimeRange || (!startDate && !endDate)) return "همه";
      if (startDate && endDate) return `${startDate} تا ${endDate}`;
      if (startDate) return `از ${startDate}`;
      if (endDate) return `تا ${endDate}`;
      return "همه";
    }
    return "همه";
  };

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-sm p-6 text-white">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FaChartLine />
        خلاصه عملکرد
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <span className="text-sm opacity-90">نرخ تحویل</span>
          <span className="font-bold">{deliveryRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between border-b border-white/20 pb-3">
          <span className="text-sm opacity-90">سفارشات فعال</span>
          <span className="font-bold">
            {formatNumber(notDeliveredOrdersCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm opacity-90">بازه زمانی</span>
          <span className="font-bold text-xs">
            {formatTimeRange(timeRange)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const DashboardHome = () => {
  // ---- State ----
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // ✅ Initialize with the default dates (1405/07/01 to Today)
  const defaultDates = useMemo(() => getDefaultDates(), []);
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  
  const [showFilters, setShowFilters] = useState(false);
  const [reportType, setReportType] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { currentUser } = useSelector((state) => state.user);

  // ---- Data Fetching ----
  const fetchReportData = useCallback(
    async (start = defaultDates.start, end = defaultDates.end, type = "all") => {
      try {
        setLoading(true);
        setIsRefreshing(true);
        setError(null);

        const params = {};
        if (start) params.startDate = start.toISOString().split("T")[0];
        if (end) params.endDate = end.toISOString().split("T")[0];
        if (type !== "all") params.type = type;

        const response = await axios.get(`${BASE_URL}/report`, { params });
        setReportData(response.data.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching report data:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "خطا در دریافت اطلاعات";
        setError(errorMessage);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [defaultDates]
  );

  // ---- Effects ----
  useEffect(() => {
    // Fetch using the default dates on mount
    fetchReportData(defaultDates.start, defaultDates.end, reportType);
  }, [fetchReportData, defaultDates, reportType]);

  // ---- Formatters ----
  const formatCurrency = useCallback((amount) => {
    if (amount == null || isNaN(amount)) return "0 دالر";
    return new Intl.NumberFormat("fa-AF").format(amount) + " دالر";
  }, []);

  const formatNumber = useCallback((number) => {
    if (number == null || isNaN(number)) return "0";
    return new Intl.NumberFormat("fa-AF").format(number);
  }, []);

  const formatTime = useCallback((date) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("fa-AF", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }, []);

  // ---- Handlers ----
  const handleApplyFilters = useCallback(() => {
    fetchReportData(startDate, endDate, reportType);
  }, [fetchReportData, startDate, endDate, reportType]);

  // ✅ Reset to the default dates (1405/07/01 to Today) instead of null
  const handleClearFilters = useCallback(() => {
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    setReportType("all");
    fetchReportData(defaultDates.start, defaultDates.end, "all");
  }, [defaultDates, fetchReportData]);

  const handleRefresh = useCallback(() => {
    fetchReportData(startDate, endDate, reportType);
  }, [fetchReportData, startDate, endDate, reportType]);

  // ---- Computed Stats ----
  const statsCards = useMemo(() => {
    if (!reportData) return [];

    const {
      totalIncome = 0,
      totalReceivedMoney = 0,
      totalPendingMoney = 0,
      totalPieces = 0,
    } = reportData;

    return [
      {
        title: "کل درآمد",
        value: formatCurrency(totalIncome),
        icon: FaMoneyBillWave,
        color: "from-blue-600 to-blue-800",
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        description: "مجموع درآمد",
        role: "admin",
        trend: "+12%",
      },
      {
        title: "دریافتی‌ها",
        value: formatCurrency(totalReceivedMoney),
        icon: FaWallet,
        color: "from-emerald-500 to-emerald-700",
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-600",
        description: "مبلغ دریافت شده",
        role: "admin",
        trend: "+8%",
      },
      {
        title: "مانده حساب",
        value: formatCurrency(totalPendingMoney),
        icon: FaDollarSign,
        color: "from-amber-500 to-amber-700",
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
        description: "مبلغ باقیمانده",
        role: "admin",
        trend: "-3%",
      },
      {
        title: "تعداد بسته‌ها",
        value: formatNumber(totalPieces),
        icon: FaBoxes,
        color: "from-purple-500 to-purple-700",
        bgColor: "bg-purple-50",
        iconColor: "text-purple-600",
        description: "تعداد کل بسته‌های ثبت شده",
        role: "reception",
        trend: "+15%",
      },
    ];
  }, [reportData, formatCurrency, formatNumber]);

  const visibleCards = useMemo(() => {
    if (!currentUser) return [];
    return statsCards.filter(
      (card) =>
        card.role === currentUser.role || currentUser.role === "admin"
    );
  }, [statsCards, currentUser]);

  // ---- Render: Loading ----
  if (loading && !reportData) {
    return <LoadingState />;
  }

  // ---- Render: Error ----
  if (error && !reportData) {
    return (
      <ErrorState
        error={error}
        onRetry={handleRefresh}
        isRefreshing={isRefreshing}
      />
    );
  }

  if (!reportData) return null;

  // ---- Render: Main ----
  return (
    <div className="p-3 md:p-6 bg-gray-50 min-h-screen">   
          <ReceiptsManager />    
    </div>
  );
};

export default DashboardHome;