// src/components/financial/shared/UI.jsx
import React from "react";
import { FaSpinner, FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { formatCurrency, formatNumber } from "./format";

export const SummaryCard = ({
  title, value, icon: Icon, color, bgColor, iconColor,
  subtitle, isLoading,
}) => (
  <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-300">
    <div className={`absolute top-0 right-0 w-1.5 h-full ${color}`} />
    <div className="flex items-start justify-between mb-4">
      <div className={`${bgColor} p-3 rounded-xl`}>
        <Icon className={`${iconColor} text-xl`} />
      </div>
    </div>
    <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
    <h3 className="text-xl lg:text-2xl font-bold text-gray-800 tabular-nums">
      {isLoading ? (
        <span className="inline-block w-24 h-7 bg-gray-100 rounded animate-pulse" />
      ) : value}
    </h3>
    {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
  </div>
);

export const LoadingOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
    <div className="flex flex-col items-center gap-2">
      <FaSpinner className="animate-spin text-blue-600 text-3xl" />
      <span className="text-xs text-gray-500">در حال بارگذاری...</span>
    </div>
  </div>
);

export const ErrorBanner = ({ error, onDismiss }) => {
  if (!error) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <FaExclamationTriangle className="text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1 text-sm text-red-700">{error}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-500 hover:bg-red-100 rounded p-1">
          <FaTimes size={14} />
        </button>
      )}
    </div>
  );
};

export const WarningBanner = ({ warnings }) => {
  if (!warnings?.length) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <FaExclamationTriangle className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm text-amber-800 space-y-1">
          {warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
        </div>
      </div>
    </div>
  );
};

export const PartHeader = ({ title, icon: Icon, color, badge, badgeColor }) => (
  <div className={`p-4 border-b border-gray-100 flex items-center justify-between ${color}`}>
    <div className="flex items-center gap-2">
      <Icon className="text-lg" />
      <h3 className="font-semibold">{title}</h3>
    </div>
    {badge !== undefined && (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor}`}>
        {badge}
      </span>
    )}
  </div>
);