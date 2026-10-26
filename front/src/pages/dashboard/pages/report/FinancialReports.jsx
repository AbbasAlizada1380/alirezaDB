// src/components/financial/FinancialReports.jsx
import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  FaBalanceScale,
  FaArrowUp,
  FaArrowDown,
  FaFilePdf,
  FaFileCsv,
  FaFileExcel,
  FaSpinner,
} from "react-icons/fa";

/* ✅ Single import block — no duplicates */
import {
  getDefaultRange,
  formatCurrency,
  toLocalISODate,
  formatShamsi,
} from "./shared/format";

import { SummaryCard } from "./shared/UI.jsx";
import FinancialFilters from "./FinancialFilters";
import IncomeOutflowsPart from "./parts/IncomeOutflowsPart";   // ✅ fixed path
import ExpensesSalariesPart from "./parts/ExpensesSalariesPart.jsx";
import UnpaidSalariesPart from "./parts/UnpaidSalariesPart.jsx";
import CustomerRemaindersPart from "./parts/CustomerRemaindersPart.jsx";

/* ✅ Download utilities */
import { downloadReportPDF } from "./shared/pdfExport";
import { downloadReportCSV } from "./shared/csvExport";
import { downloadReportExcel } from "./shared/excelExport";

const FinancialReports = () => {
  /* ✅ 1. Set the default start date to 1405/07/01 (Oct 23, 2026) */
  const defaultRange = useMemo(() => {
    const today = new Date(); // End date remains as it is (Today)
    const startDate = new Date(2026, 8, 23); // 1405/07/01
    return { start: startDate, end: today };
  }, []);

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [showFilters, setShowFilters] = useState(true);

  /* ✅ A single "applied" range — children fetch only when this changes */
  const [applied, setApplied] = useState({
    from: toLocalISODate(defaultRange.start),
    to: toLocalISODate(defaultRange.end),
  });

  /* ---------- Live data from each part ---------- */
  const [part1, setPart1] = useState(null);
  const [part2, setPart2] = useState(null);
  const [part3, setPart3] = useState(null);
  const [part4, setPart4] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- Store raw data per part for exports ---------- */
  const rawDataRef = useRef({
    income: null,
    outflow: null,
    unpaid: null,
    remainders: null,
  });

  /* ---------- Download states ---------- */
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleApply = () => {
    setApplied({
      from: toLocalISODate(startDate),
      to: toLocalISODate(endDate),
    });
    setLastUpdated(new Date());
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  /* ✅ 2. Update handleReset to go back to 1405/07/01 */
  const handleReset = () => {
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
    setApplied({ 
      from: toLocalISODate(defaultRange.start), 
      to: toLocalISODate(defaultRange.end) 
    });
    setLastUpdated(new Date());
  };

  const handleRefresh = () => {
    setApplied((p) => ({ ...p }));
    setLastUpdated(new Date());
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  /* ✅ 3. Update hasCustomRange to check against the new default */
  const hasCustomRange = useMemo(() => {
    return (
      toLocalISODate(startDate) !== toLocalISODate(defaultRange.start) ||
      toLocalISODate(endDate) !== toLocalISODate(defaultRange.end)
    );
  }, [startDate, endDate, defaultRange]);

  /* ---------- Aggregate top summary ---------- */
  const summary = useMemo(() => {
    const totalIncome = part1?.grandTotal || 0;
    const totalOutflow = part2?.grandTotal || 0;
    const balance = totalIncome - totalOutflow;

    return {
      totalIncome,
      totalOutflow,
      balance,
      unpaid: part3?.totalUnpaid || 0,
      customerRemainder: part4?.totalCustomerRemainder || 0,
    };
  }, [part1, part2, part3, part4]);

  /* ---------- Callbacks that receive BOTH totals AND raw lists ---------- */
  const handleIncomeLoaded = useCallback((data) => {
    setPart1(data.summary);
    rawDataRef.current.income = data.raw;
  }, []);

  const handleOutflowLoaded = useCallback((data) => {
    setPart2(data.summary);
    rawDataRef.current.outflow = data.raw;
  }, []);

  const handleUnpaidLoaded = useCallback((data) => {
    setPart3(data.summary);
    rawDataRef.current.unpaid = data.raw;
  }, []);

  const handleRemaindersLoaded = useCallback((data) => {
    setPart4(data.summary);
    rawDataRef.current.remainders = data.raw;
  }, []);

  /* ---------- Download handlers ---------- */
  const buildExportPayload = () => {
    const raw = rawDataRef.current;
    return {
      dateRange: applied,
      generatedAt: new Date(),
      summary,
      receipts: raw.income?.receipts || [],
      valetDeposits: raw.income?.valetDeposits || [],
      expenses: raw.outflow?.expenses || [],
      paidSalaries: raw.outflow?.paidSalaries || [],
      unpaidLists: raw.unpaid?.lists || [],
      bills: raw.remainders?.bills || [],
    };
  };

  const handlePDFDownload = async () => {
    setDownloadingPDF(true);
    try {
      await downloadReportPDF(buildExportPayload());
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("خطا در ساخت PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleCSVDownload = () => {
    setDownloadingCSV(true);
    try {
      downloadReportCSV(buildExportPayload());
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("خطا در ساخت CSV");
    } finally {
      setDownloadingCSV(false);
    }
  };

  const handleExcelDownload = async () => {
    setDownloadingExcel(true);
    try {
      await downloadReportExcel(buildExportPayload());
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("خطا در ساخت Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  /* =========================================================
     Render
     ========================================================= */
  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen space-y-8">
      {/* ============ Header ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FaBalanceScale className="text-blue-600 text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">گزارش مالی</h1>
            <p className="text-sm text-gray-500">
              گزارش کامل ۴ بخشی — از {formatShamsi(applied.from)} تا{" "}
              {formatShamsi(applied.to)}
            </p>
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePDFDownload}
            disabled={downloadingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingPDF ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
            {downloadingPDF ? "..." : "PDF"}
          </button>

          <button
            onClick={handleCSVDownload}
            disabled={downloadingCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingCSV ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}
            {downloadingCSV ? "..." : "CSV"}
          </button>

          <button
            onClick={handleExcelDownload}
            disabled={downloadingExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-xl hover:bg-green-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloadingExcel ? <FaSpinner className="animate-spin" /> : <FaFileExcel />}
            {downloadingExcel ? "..." : "Excel"}
          </button>
        </div>
      </div>

      {/* ============ Filters ============ */}
      <FinancialFilters
        startDate={startDate}
        endDate={endDate}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        onApply={handleApply}
        onReset={handleReset}
        onRefresh={handleRefresh}
        hasCustomRange={hasCustomRange}
        loading={refreshing}
        lastUpdated={lastUpdated}
        show={showFilters}
        toggleShow={() => setShowFilters((v) => !v)}
      />

      {/* ============ TOP SUMMARY ============ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          title="مجموع عواید"
          value={formatCurrency(summary.totalIncome)}
          icon={FaArrowUp}
          color="bg-gradient-to-b from-emerald-500 to-emerald-700"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="رسیدها + واریز سهام‌دار"
        />
        <SummaryCard
          title="مجموع خروجی"
          value={formatCurrency(summary.totalOutflow)}
          icon={FaArrowDown}
          color="bg-gradient-to-b from-red-500 to-red-700"
          bgColor="bg-red-50"
          iconColor="text-red-600"
          subtitle="مصارف + معاشات پرداخت‌شده"
        />
        <SummaryCard
          title="مانده خالص"
          value={formatCurrency(summary.balance)}
          icon={FaBalanceScale}
          color={
            summary.balance >= 0
              ? "bg-gradient-to-b from-blue-500 to-blue-700"
              : "bg-gradient-to-b from-amber-500 to-amber-700"
          }
          bgColor={summary.balance >= 0 ? "bg-blue-50" : "bg-amber-50"}
          iconColor={summary.balance >= 0 ? "text-blue-600" : "text-amber-600"}
          subtitle={summary.balance >= 0 ? "سود" : "زیان"}
        />
        <SummaryCard
          title="باقیات کل"
          value={formatCurrency(summary.unpaid + summary.customerRemainder)}
          icon={FaBalanceScale}
          color="bg-gradient-to-b from-purple-500 to-purple-700"
          bgColor="bg-purple-50"
          iconColor="text-purple-600"
          subtitle={`معاشات: ${formatCurrency(summary.unpaid)} • مشتریان: ${formatCurrency(summary.customerRemainder)}`}
        />
      </div>

      {/* ============ PART 1 ============ */}
      <IncomeOutflowsPart
        from={applied.from}
        to={applied.to}
        onLoaded={handleIncomeLoaded}
      />

      <hr className="border-t-2 border-dashed border-gray-200" />

      {/* ============ PART 2 ============ */}
      <ExpensesSalariesPart
        from={applied.from}
        to={applied.to}
        onLoaded={handleOutflowLoaded}
      />

      <hr className="border-t-2 border-dashed border-gray-200" />

      {/* ============ PART 3 ============ */}
      <UnpaidSalariesPart
        from={applied.from}
        to={applied.to}
        onLoaded={handleUnpaidLoaded}
      />

      <hr className="border-t-2 border-dashed border-gray-200" />

      {/* ============ PART 4 ============ */}
      <CustomerRemaindersPart
        from={applied.from}
        to={applied.to}
        onLoaded={handleRemaindersLoaded}
      />
    </div>
  );
};

export default FinancialReports;