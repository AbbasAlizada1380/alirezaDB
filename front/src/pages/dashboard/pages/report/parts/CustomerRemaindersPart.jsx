// src/components/financial/parts/CustomerRemaindersPart.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FaUser, FaHandHoldingUsd, FaUsers } from "react-icons/fa";
import {
  formatCurrency,
  formatNumber,
  formatShamsi,
} from "../shared/format";
import { extractArray, num } from "../shared/extract";
import { SummaryCard, LoadingOverlay, PartHeader } from "../shared/UI.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// ✅ Constant start date (1405/07/01)
// Note: In JS, month 8 is September (0-indexed).
const startDate = new Date(2026, 8, 23); 

const CustomerRemaindersPart = ({ to, onLoaded }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const fetchByType = async (customerType) => {
      try {
        const res = await axios.get(`${BASE_URL}/bills`, {
          params: {
            page: 1,
            limit: 10000,
            status: "unpaid,partial",
            customerType,
            // ✅ Use the constant startDate
            from: startDate.toISOString().split("T")[0], 
            ...(to ? { to } : {}),
          },
        });
        return extractArray(res.data, "bills", "results").map((b) => ({
          ...b,
          customerType: b.customerType || customerType,
        }));
      } catch (err) {
        console.warn(`bills/${customerType} fetch:`, err.message);
        return [];
      }
    };

    try {
      const [temporary, permanent] = await Promise.all([
        fetchByType("temporary"),
        fetchByType("permanent"),
      ]);

      const merged = [...permanent, ...temporary].sort(
        (a, b) => num(b.remaind) - num(a.remaind)
      );

      setBills(merged);
    } catch (err) {
      setError(err.message || "خطا در دریافت باقیات مشتریان");
    } finally {
      setLoading(false);
    }
  }, [to]); // ✅ `from` is removed from dependencies since it's a constant now

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Totals ---------- */
  const totals = useMemo(() => {
    const totalRemainder = bills.reduce((s, b) => s + num(b.remaind), 0);
    const totalBilled = bills.reduce((s, b) => s + num(b.total), 0);
    const totalReceived = bills.reduce(
      (s, b) =>
        s +
        (Array.isArray(b.receipt)
          ? b.receipt.reduce((x, y) => x + num(y), 0)
          : 0),
      0
    );

    const permanentCount = bills.filter(
      (b) => b.customerType === "permanent"
    ).length;
    const temporaryCount = bills.filter(
      (b) => b.customerType === "temporary"
    ).length;

    return {
      count: bills.length,
      permanentCount,
      temporaryCount,
      totalRemainder,
      totalBilled,
      totalReceived,
    };
  }, [bills]);

  useEffect(() => {
    onLoaded?.({
      summary: {
        customerRemainderCount: totals.count,
        totalCustomerRemainder: totals.totalRemainder,
        permanentRemainderCount: totals.permanentCount,
        temporaryRemainderCount: totals.temporaryCount,
      },
      raw: {
        bills,
      },
    });
  }, [totals, bills, onLoaded]);

  /* ---------- Render ---------- */
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-100 rounded-xl">
          <FaUsers className="text-purple-600 text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            ۴. باقیات مشتریان
          </h2>
          <p className="text-xs text-gray-500">
            مبالغ باقیمانده روی حساب مشتریان (دائمی و موقت)
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative">
        {loading && <LoadingOverlay />}

        <SummaryCard
          title="تعداد بیل‌های ناتمام"
          value={formatNumber(totals.count)}
          icon={FaUsers}
          color="bg-gradient-to-b from-purple-500 to-purple-700"
          bgColor="bg-purple-50"
          iconColor="text-purple-600"
          subtitle={`دائمی: ${formatNumber(
            totals.permanentCount
          )} • موقت: ${formatNumber(totals.temporaryCount)}`}
          isLoading={loading}
        />

        <SummaryCard
          title="مجموع دریافت‌شده"
          value={formatCurrency(totals.totalReceived)}
          icon={FaHandHoldingUsd}
          color="bg-gradient-to-b from-emerald-500 to-emerald-700"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle="مبالغ دریافت‌شده"
          isLoading={loading}
        />

        <SummaryCard
          title="مجموع باقیات"
          value={formatCurrency(totals.totalRemainder)}
          icon={FaHandHoldingUsd}
          color="bg-gradient-to-b from-fuchsia-500 to-fuchsia-700"
          bgColor="bg-fuchsia-50"
          iconColor="text-fuchsia-600"
          subtitle="مبلغ کل طلب‌ها"
          isLoading={loading}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <PartHeader
          title="باقیات مشتریان"
          icon={FaUser}
          color="bg-purple-50 text-purple-800"
          badge={formatNumber(totals.count)}
          badgeColor="bg-purple-100 text-purple-700"
        />

        {bills.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            هیچ مشتری با باقیات یافت نشد ✓
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {bills.map((b) => {
              const total = num(b.total);
              const remaind = num(b.remaind);
              const received = total - remaind;
              const pct = total > 0 ? (received / total) * 100 : 0;
              const isPermanent = b.customerType === "permanent";

              return (
                <div
                  key={`${b.customerType}-${b.id}`}
                  className="p-4 hover:bg-purple-50/40 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate flex items-center gap-1.5">
                        <FaUser className="text-purple-500 text-xs flex-shrink-0" />
                        {b.name || `مشتری #${b.customer}`}

                        {/* Customer type badge */}
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isPermanent
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isPermanent ? "دائمی" : "موقت"}
                        </span>

                        {/* Status badge */}
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            b.status === "unpaid"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {b.status === "unpaid" ? "پرداخت‌نشده" : "ناقص"}
                        </span>
                      </p>

                      {b.phoneNumber && (
                        <p
                          className="text-xs text-gray-500 truncate"
                          dir="ltr"
                        >
                          {b.phoneNumber}
                        </p>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatShamsi(b.createdAt)}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-purple-700 text-sm whitespace-nowrap">
                        {formatCurrency(remaind)}
                      </p>
                      <p className="text-[10px] text-gray-400">باقیمانده</p>
                    </div>
                  </div>

                  {/* Progress bar: received / total */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {formatCurrency(received)} / {formatCurrency(total)}
                    </span>
                  </div>

                  {/* Individual receipt breakdown */}
                  {Array.isArray(b.receipt) && b.receipt.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2" dir="ltr">
                      {b.receipt.map((r, i) => (
                        <span
                          key={i}
                          className="inline-block font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5"
                        >
                          +{r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerRemaindersPart;