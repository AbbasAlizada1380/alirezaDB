// src/components/expenses/ExpenseTable.jsx
import { useSelector } from "react-redux";
import moment from "moment-jalaali";
import { FaEdit, FaTrash, FaClipboardList } from "react-icons/fa";
import Pagination from "../../pagination/Pagination";
import ExpenseDateDownload from "./ExpenseDateDownload";

/* ✅ Load Persian locale once */
moment.loadPersian({ usePersianDigits: false, dialect: "persian-modern" });

/* ✅ Hijri Shamsi formatter */
const formatShamsi = (d) => {
  if (!d) return "—";
  try {
    return moment(d).format("jYYYY/jMM/jDD");
  } catch {
    return "—";
  }
};

const ExpenseTable = ({
  expenses,
  loading,
  currentPage,
  totalPages,
  totalItems = 0,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  const { currentUser } = useSelector((state) => state.user);

  return (
    <div className="bg-white min-h-screen rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FaClipboardList />
            </div>
            <div>
              <h2 className="text-xl font-bold">لیست هزینه‌ها</h2>
              <p className="text-xs text-white/80">
                {totalItems} مورد ثبت شده
              </p>
            </div>
          </div>

          {/* ✅ Flexible download component */}
          <ExpenseDateDownload />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead className="bg-primary/5 text-primary">
            <tr>
              <th className="p-3 border-b font-semibold">#</th>
              <th className="p-3 border-b font-semibold">هدف هزینه</th>
              <th className="p-3 border-b font-semibold">پرداخت کننده</th>
              <th className="p-3 border-b font-semibold">مبلغ (افغانی)</th>
              <th className="p-3 border-b font-semibold">توضیحات</th>
              <th className="p-3 border-b font-semibold">تاریخ ثبت</th>
              <th className="p-3 border-b font-semibold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
                    <p className="text-gray-600">در حال بارگذاری...</p>
                  </div>
                </td>
              </tr>
            ) : expenses.length ? (
              expenses.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-gray-50 border-b last:border-0 transition-colors"
                >
                  <td className="p-3 text-gray-600">{e.id}</td>
                  <td className="p-3 font-medium text-gray-800">
                    <div className="max-w-xs mx-auto truncate">
                      {e.purpose}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {e.by}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col items-center">
                      <span className="text-primary font-bold text-lg">
                        {parseFloat(e.amount || 0).toLocaleString("en-US")}
                      </span>
                      <span className="text-xs text-gray-500">افغانی</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-xs mx-auto">
                      {e.description ? (
                        <div
                          className="text-gray-600 text-sm truncate"
                          title={e.description}
                        >
                          {e.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </td>
                  {/* ✅ Shamsi date */}
                  <td className="p-3 text-sm text-gray-600">
                    {formatShamsi(e.createdAt)}
                  </td>
                  <td className="p-3">
                    {currentUser?.role === "admin" ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEdit(e)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                          title="ویرایش"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                      <FaClipboardList className="text-gray-300 text-2xl" />
                    </div>
                    <p className="text-gray-500 text-lg">
                      هیچ هزینه‌ای ثبت نشده است
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      برای شروع، هزینه جدیدی اضافه کنید
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;