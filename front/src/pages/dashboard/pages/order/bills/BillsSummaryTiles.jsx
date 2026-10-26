// src/components/bills/BillsSummaryTiles.jsx
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "۰ افغانی";
  return new Intl.NumberFormat("en-US").format(Number(amount)) + " افغانی";
};

export default function BillsSummaryTiles({ summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500 mb-1">مجموع (صفحه)</p>
        <p className="text-base md:text-lg font-bold text-gray-900">
          {formatCurrency(summary.total)}
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs text-emerald-600 mb-1">پرداخت شده</p>
        <p className="text-base md:text-lg font-bold text-emerald-700">
          {formatCurrency(summary.paid)}
        </p>
      </div>
      <div
        className={`rounded-2xl border p-4 ${
          summary.remaining > 0
            ? "border-red-200 bg-red-50"
            : "border-green-200 bg-green-50"
        }`}
      >
        <p className="text-xs text-gray-600 mb-1">باقی مانده</p>
        <p
          className={`text-base md:text-lg font-bold ${
            summary.remaining > 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {formatCurrency(summary.remaining)}
        </p>
      </div>
    </div>
  );
}