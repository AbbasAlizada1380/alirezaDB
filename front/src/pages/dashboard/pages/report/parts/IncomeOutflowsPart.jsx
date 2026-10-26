// src/components/financial/parts/IncomeOutflowsPart.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FaArrowUp, FaReceipt, FaHandHoldingUsd, FaCar } from "react-icons/fa";
import {
  formatCurrency,
  formatNumber,
  formatShamsi,
} from "../shared/format.js";
import { extractArray, num } from "../shared/extract.js";
import { SummaryCard, LoadingOverlay, PartHeader } from "../shared/UI.jsx";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const IncomeOutflowsPart = ({ from, to, onLoaded }) => {
  const [receipts, setReceipts] = useState([]);
  const [valetDeposits, setValetDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);

    const fetchReceipts = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/receipts/`, {
          params: { from, to, page: 1, limit: 10000 },
        });
        return extractArray(res.data, "receipts", "results");
      } catch (err) {
        console.warn("receipts fetch:", err.message);
        return [];
      }
    };

    const fetchValets = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/valets/`, {
          params: { from, to, type: "deposit", page: 1, limit: 10000 },
        });
        return extractArray(res.data, "valets", "results");
      } catch (err) {
        console.warn("valets fetch:", err.message);
        return [];
      }
    };

    try {
      const [recList, valList] = await Promise.all([
        fetchReceipts(),
        fetchValets(),
      ]);
      setReceipts(recList);
      setValetDeposits(valList);
    } catch (err) {
      setError(err.message || "خطا در دریافت عواید");
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
    const totalReceipts = receipts.reduce((s, r) => s + getAmount(r), 0);
    const totalValetDeposits = valetDeposits.reduce(
      (s, v) => s + num(v.amount),
      0
    );
    return {
      totalReceipts,
      totalValetDeposits,
      grandTotal: totalReceipts + totalValetDeposits,
      receiptCount: receipts.length,
      valetCount: valetDeposits.length,
    };
  }, [receipts, valetDeposits]);

  useEffect(() => {
    onLoaded?.({
      summary: {
        totalReceipts: totals.totalReceipts,
        totalValetDeposits: totals.totalValetDeposits,
        grandTotal: totals.grandTotal,
        receiptCount: totals.receiptCount,
        valetCount: totals.valetCount,
      },
      raw: {
        receipts,
        valetDeposits,
      },
    });
  }, [totals, receipts, valetDeposits, onLoaded]);

  /* ---------- Render ---------- */
  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 rounded-xl">
          <FaArrowUp className="text-emerald-600 text-lg" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">۱. عواید و واریزها</h2>
          <p className="text-xs text-gray-500">
            رسیدها + واریز سهام‌دارها (پول وارد شده)
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
          title="رسیدها"
          value={formatCurrency(totals.totalReceipts)}
          icon={FaReceipt}
          color="bg-gradient-to-b from-emerald-500 to-emerald-700"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          subtitle={`${formatNumber(totals.receiptCount)} مورد`}
          isLoading={loading}
        />
        <SummaryCard
          title="واریز سهام‌دارها"
          value={formatCurrency(totals.totalValetDeposits)}
          icon={FaCar}
          color="bg-gradient-to-b from-teal-500 to-teal-700"
          bgColor="bg-teal-50"
          iconColor="text-teal-600"
          subtitle={`${formatNumber(totals.valetCount)} مورد`}
          isLoading={loading}
        />
        <SummaryCard
          title="مجموع عواید"
          value={formatCurrency(totals.grandTotal)}
          icon={FaArrowUp}
          color="bg-gradient-to-b from-blue-500 to-blue-700"
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
          subtitle="کل پول وارد شده"
          isLoading={loading}
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receipts List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <PartHeader
            title="رسیدها"
            icon={FaReceipt}
            color="bg-emerald-50 text-emerald-800"
            badge={formatNumber(totals.receiptCount)}
            badgeColor="bg-emerald-100 text-emerald-700"
          />
          {receipts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              رسیدی در این بازه نیست
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {receipts.map((r) => (
                <div key={r.id} className="p-3 hover:bg-emerald-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {r.name || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.description || r.customerInfo?.fullname || "—"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatShamsi(r.createdAt)}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700 text-sm whitespace-nowrap">
                      +{formatCurrency(r.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Valet Deposits List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <PartHeader
            title="واریز سهام‌دارها"
            icon={FaHandHoldingUsd}
            color="bg-teal-50 text-teal-800"
            badge={formatNumber(totals.valetCount)}
            badgeColor="bg-teal-100 text-teal-700"
          />
          {valetDeposits.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              واریزی در این بازه نیست
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {valetDeposits.map((v) => (
                <div key={v.id} className="p-3 hover:bg-teal-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {v.holderInfo?.fullName || v.holder_name || "—"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {v.description || "واریز"}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatShamsi(v.createdAt)}
                      </p>
                    </div>
                    <p className="font-bold text-teal-700 text-sm whitespace-nowrap">
                      +{formatCurrency(v.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default IncomeOutflowsPart;