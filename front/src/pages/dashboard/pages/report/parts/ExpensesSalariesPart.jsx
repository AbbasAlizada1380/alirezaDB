// src/components/financial/parts/ExpensesSalariesPart.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  FaArrowDown,
  FaMoneyBillWave,
  FaHandHoldingHeart,
  FaChevronDown,
  FaChevronRight,
  FaUserTie,
} from "react-icons/fa";
import {
  formatCurrency,
  formatNumber,
  formatShamsi,
  formatDayLabelShamsi,
} from "../shared/format";
import { extractArray, num } from "../shared/extract";
import { SummaryCard, LoadingOverlay, PartHeader } from "../shared/UI.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

/* ---------- Sub: Expandable day group ---------- */
const DayGroup = ({ day, expanded, onToggle }) => (
  <div className="border-b border-gray-100 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full px-4 py-2.5 bg-pink-50/70 hover:bg-pink-100/70 transition flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        {expanded ? (
          <FaChevronDown className="text-pink-500 text-[10px]" />
        ) : (
          <FaChevronRight className="text-pink-500 text-[10px]" />
        )}
        <div className="text-right">
          <p className="text-xs font-bold text-pink-800">
            {formatDayLabelShamsi(day.date)}
          </p>
          <p className="text-[10px] text-pink-600">
            {formatNumber(day.count)} پرداخت
          </p>
        </div>
      </div>
      <p className="text-sm font-bold text-pink-700 tabular-nums">
        {formatCurrency(day.totalPaid)}
      </p>
    </button>
    {expanded && (
      <div className="divide-y divide-gray-100 bg-white">
        {day.payments.map((p) => (
          <div
            key={p.id}
            className="p-3 pr-8 hover:bg-pink-50/30 border-r-2 border-r-pink-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate flex items-center gap-1.5">
                  <FaUserTie className="text-pink-500 text-xs flex-shrink-0" />
                  {p.staffName || p.staff_name || "—"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {p.listName || p.note || "—"}
                </p>
              </div>
              <p className="font-bold text-pink-700 text-sm whitespace-nowrap">
                -{formatCurrency(p.amount)}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ---------- Main Part ---------- */
const ExpensesSalariesPart = ({ from, to, onLoaded }) => {
  const [expenses, setExpenses] = useState([]);
  const [paidDaily, setPaidDaily] = useState([]);
  const [paidSalaries, setPaidSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);

    const fetchExpenses = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/expense/date_range`, {
          params: { from, to, startDate: from, endDate: to, page_size: 10000 },
        });
        return extractArray(res.data, "expenses", "expenditures", "results");
      } catch (err) {
        console.warn("expenses fetch:", err.message);
        return [];
      }
    };

    const fetchPaidDaily = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/salary-lists/reports/paid/daily`,
          {
            params: { from, to, page_size: 10000 },
          }
        );
        const data = res.data || {};
        return {
          days: Array.isArray(data.days) ? data.days : [],
          payments: Array.isArray(data.payments) ? data.payments : [],
        };
      } catch (err) {
        console.warn("paid daily fetch:", err.message);
        return { days: [], payments: [] };
      }
    };

    try {
      const [expList, paidData] = await Promise.all([
        fetchExpenses(),
        fetchPaidDaily(),
      ]);
      setExpenses(expList);
      setPaidDaily(paidData.days);
      setPaidSalaries(paidData.payments);
    } catch (err) {
      setError(err.message || "خطا در دریافت مصارف");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Totals ---------- */
  const totals = useMemo(() => {
    const getAmount = (x) => num(x.amount ?? x.total ?? x.value);
    const totalExpenses = expenses.reduce((s, e) => s + getAmount(e), 0);
    const totalPaidSalaries = paidSalaries.reduce(
      (s, p) => s + num(p.amount),
      0
    );
    return {
      totalExpenses,
      totalPaidSalaries,
      grandTotal: totalExpenses + totalPaidSalaries,
      expenseCount: expenses.length,
      paidSalaryCount: paidSalaries.length,
      paidSalaryDayCount: paidDaily.length,
    };
  }, [expenses, paidSalaries, paidDaily]);

  useEffect(() => {
    onLoaded?.({
      summary: {
        totalExpenses: totals.totalExpenses,
        totalPaidSalaries: totals.totalPaidSalaries,
        grandTotal: totals.grandTotal,
        expenseCount: totals.expenseCount,
        paidSalaryCount: totals.paidSalaryCount,
        paidSalaryDayCount: totals.paidSalaryDayCount,
      },
      raw: {
        expenses,
        paidSalaries,
        paidDaily,
      },
    });
  }, [totals, expenses, paidSalaries, paidDaily, onLoaded]);

  const toggleDay = (date) =>
    setExpandedDays((p) => ({ ...p, [date]: !p[date] }));

  /* ---------- Render ---------- */
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-red-100 rounded-xl">
          <FaArrowDown className="text-red-600 text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            ۲. مصارف و معاشات پرداخت‌شده
          </h2>
          <p className="text-xs text-gray-500">
            مصارف عمومی + معاشات پرداخت‌شده (پول خارج شده)
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
        {loading && <LoadingOverlay />}
        <SummaryCard
          title="مصارف عمومی"
          value={formatCurrency(totals.totalExpenses)}
          icon={FaArrowDown}
          color="bg-gradient-to-b from-red-500 to-red-700"
          bgColor="bg-red-50"
          iconColor="text-red-600"
          subtitle={`${formatNumber(totals.expenseCount)} مورد`}
          isLoading={loading}
        />
        <SummaryCard
          title="معاشات پرداخت‌شده"
          value={formatCurrency(totals.totalPaidSalaries)}
          icon={FaHandHoldingHeart}
          color="bg-gradient-to-b from-pink-500 to-pink-700"
          bgColor="bg-pink-50"
          iconColor="text-pink-600"
          subtitle={`${formatNumber(totals.paidSalaryCount)} پرداخت`}
          isLoading={loading}
        />
        <SummaryCard
          title="مجموع خروجی"
          value={formatCurrency(totals.grandTotal)}
          icon={FaMoneyBillWave}
          color="bg-gradient-to-b from-rose-500 to-rose-700"
          bgColor="bg-rose-50"
          iconColor="text-rose-600"
          subtitle="کل پول خارج شده"
          isLoading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <PartHeader
            title="مصارف عمومی"
            icon={FaMoneyBillWave}
            color="bg-red-50 text-red-800"
            badge={formatNumber(totals.expenseCount)}
            badgeColor="bg-red-100 text-red-700"
          />
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              مصرفی در این بازه نیست
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {expenses.map((e, i) => (
                <div key={e.id ?? i} className="p-3 hover:bg-red-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {e.name || e.description || e.title || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {e.category || e.receiver || e.type || "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatShamsi(e.createdAt || e.date || e.payment_date)}
                      </p>
                    </div>
                    <p className="font-bold text-red-700 text-sm whitespace-nowrap">
                      -{formatCurrency(e.amount ?? e.total ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paid Salary (daily grouped) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <PartHeader
            title="معاشات پرداخت‌شده (روزانه)"
            icon={FaHandHoldingHeart}
            color="bg-pink-50 text-pink-800"
            badge={`${formatNumber(totals.paidSalaryDayCount)} روز`}
            badgeColor="bg-pink-100 text-pink-700"
          />
          {paidDaily.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              پرداختی در این بازه نیست
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {paidDaily.map((day) => (
                <DayGroup
                  key={day.date}
                  day={day}
                  expanded={!!expandedDays[day.date]}
                  onToggle={() => toggleDay(day.date)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ExpensesSalariesPart;