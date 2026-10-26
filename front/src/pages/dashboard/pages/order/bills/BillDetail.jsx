// src/components/bills/BillDetail.jsx
import {
  FaFileInvoiceDollar,
  FaTimes,
  FaTrash,
  FaUser,
  FaPhone,
  FaClock,
  FaPrint,
} from "react-icons/fa";
import moment from "moment-jalaali";

moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

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
        <FaUser className="text-[10px]" />
        دائم
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <FaClock className="text-[10px]" />
      موقت
    </span>
  );
};

export default function BillDetail({ bill, onClose, onDelete, onPrint }) {
  if (!bill) return null;

  const paid = Array.isArray(bill.receipt)
    ? bill.receipt.reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <FaFileInvoiceDollar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">بل #{bill.id}</h3>
            <p className="text-xs text-white/80">{formatDate(bill.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPrint?.(bill)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="چاپ"
          >
            <FaPrint />
          </button>
          <button
            onClick={() => onDelete(bill.id)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="حذف"
          >
            <FaTrash />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="بستن"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              اطلاعات مشتری
            </span>
            {customerTypeBadge(bill.customerType)}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-800">
              <FaUser className="text-primary text-xs" />
              <span className="font-medium">{bill.name || "—"}</span>
            </div>
            {bill.phoneNumber && (
              <div className="flex items-center gap-2 text-gray-600" dir="ltr">
                <FaPhone className="text-primary text-xs" />
                <span>{bill.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-[11px] text-gray-500 mb-1">مجموع</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(bill.total)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-[11px] text-emerald-600 mb-1">پرداخت شده</p>
            <p className="text-sm font-bold text-emerald-700">
              {formatCurrency(paid)}
            </p>
          </div>
          <div
            className={`rounded-xl border p-3 ${
              Number(bill.remaind) > 0
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }`}
          >
            <p className="text-[11px] text-gray-500 mb-1">باقی مانده</p>
            <p
              className={`text-sm font-bold ${
                Number(bill.remaind) > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(bill.remaind)}
            </p>
          </div>
        </div>

        {/* Receipts */}
        {Array.isArray(bill.receipt) && bill.receipt.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              پرداخت‌ها ({bill.receipt.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {bill.receipt.map((amount, i) => (
                <span
                  key={i}
                  className="inline-block font-mono text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1"
                  dir="ltr"
                >
                  {Number(amount).toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        <div className="rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700">
              سفارش‌ها ({bill.orders?.length || 0})
            </p>
            {statusBadge(bill.status)}
          </div>

          {bill.orders && bill.orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-right font-medium text-gray-600">
                      سایز
                    </th>
                    <th className="p-2 text-right font-medium text-gray-600">
                      تعداد
                    </th>
                    <th className="p-2 text-right font-medium text-gray-600">
                      شماره
                    </th>
                    <th className="p-2 text-right font-medium text-gray-600">
                      نوع
                    </th>
                    <th className="p-2 text-right font-medium text-gray-600">
                      قیمت
                    </th>
                    <th className="p-2 text-right font-medium text-gray-600">
                      جمع
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bill.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="p-2 text-gray-800 font-medium">{o.size}</td>
                      <td className="p-2 text-gray-700">{o.quantity}</td>
                      <td className="p-2 text-gray-700">
                        {o.athleteNumber || "—"}
                      </td>
                      <td className="p-2 text-gray-700">{o.jerseyType}</td>
                      <td className="p-2 text-gray-700">
                        {Number(o.price).toLocaleString()}
                      </td>
                      <td className="p-2 font-semibold text-primary">
                        {Number(o.total || 0) > 0
                          ? Number(o.total).toLocaleString()
                          : (
                              Number(o.price) * Number(o.quantity)
                            ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">
              سفارشی ثبت نشده
            </p>
          )}
        </div>
      </div>
    </div>
  );
}