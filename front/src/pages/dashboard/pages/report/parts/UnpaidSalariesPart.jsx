// src/components/financial/parts/UnpaidSalariesPart.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FaExclamationTriangle, FaUsers } from "react-icons/fa";
import {
  formatCurrency,
  formatNumber,
  formatShamsi,
} from "../shared/format";
import { extractArray, num } from "../shared/extract";
import { SummaryCard, LoadingOverlay, PartHeader } from "../shared/UI.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const UnpaidSalariesPart = ({ from, to, onLoaded }) => {
  const [unpaidLists, setUnpaidLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${BASE_URL}/salary-lists/`, {
        params: { from, to, startDate: from, endDate: to, page_size: 10000 },
      });
      const list = extractArray(res.data, "salaries", "staff_salaries", "results");

      /* Keep only lists with unpaid balance (total > paid) */
      const unpaid = list.filter((s) => {
        const total = num(s.total);
        const paid = num(s.paid);
        return total > paid;
      });

      setUnpaidLists(unpaid);
    } catch (err) {
      setError(err.message || "خطا در دریافت معاشات پرداخت‌نشده");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Totals ---------- */
  const totals = useMemo(() => {
    const rows = unpaidLists.map((s) => {
      const total = num(s.total);
      const paid = num(s.paid);
      return { total, paid, unpaid: total - paid };
    });
    const totalUnpaid = rows.reduce((sum, r) => sum + r.unpaid, 0);
    const totalOwed = rows.reduce((sum, r) => sum + r.total, 0);
    const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0);

    return {
      count: unpaidLists.length,
      totalOwed,
      totalPaid,
      totalUnpaid,
    };
  }, [unpaidLists]);

  useEffect(() => {
    onLoaded?.({
      summary: {
        unpaidCount: totals.count,
        totalUnpaid: totals.totalUnpaid,
        totalOwed: totals.totalOwed,
        totalPaidTowardsUnpaid: totals.totalPaid,
      },
      raw: {
        lists: unpaidLists,
      },
    });
  }, [totals, unpaidLists, onLoaded]);

  /* ---------- Render ---------- */
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-amber-100 rounded-xl">
          <FaExclamationTriangle className="text-amber-600 text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            ۳. معاشات پرداخت‌نشده
          </h2>
          <p className="text-xs text-gray-500">
            لیست‌هایی که هنوز به کارمندان پرداخت نشده‌اند
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Two cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative">
        {loading && <LoadingOverlay />}

        <SummaryCard
          title="تعداد لیست‌های باقیمانده"
          value={formatNumber(totals.count)}
          icon={FaUsers}
          color="bg-gradient-to-b from-amber-500 to-amber-700"
          bgColor="bg-amber-50"
          iconColor="text-amber-600"
          subtitle="لیست ناتمام"
          isLoading={loading}
        />

        <SummaryCard
          title="مانده معاشات"
          value={formatCurrency(totals.totalUnpaid)}
          icon={FaExclamationTriangle}
          color="bg-gradient-to-b from-red-500 to-red-700"
          bgColor="bg-red-50"
          iconColor="text-red-600"
          subtitle="مبلغ باقیمانده"
          isLoading={loading}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <PartHeader
          title="لیست‌های پرداخت‌نشده"
          icon={FaExclamationTriangle}
          color="bg-amber-50 text-amber-800"
          badge={formatNumber(totals.count)}
          badgeColor="bg-amber-100 text-amber-700"
        />

        {unpaidLists.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            تمام معاشات این بازه پرداخت شده است ✓
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {unpaidLists.map((s) => {
              const total = num(s.total);
              const paid = num(s.paid);
              const unpaid = total - paid;
              const pct = total > 0 ? (paid / total) * 100 : 0;

              return (
                <div key={s.id} className="p-4 hover:bg-amber-50/40 transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {s.name || s.range || `لیست #${s.id}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {s.range || s.description || "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatShamsi(s.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-700 text-sm whitespace-nowrap">
                        {formatCurrency(unpaid)}
                      </p>
                      <p className="text-[10px] text-gray-400">باقیمانده</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {formatCurrency(paid)} / {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default UnpaidSalariesPart;