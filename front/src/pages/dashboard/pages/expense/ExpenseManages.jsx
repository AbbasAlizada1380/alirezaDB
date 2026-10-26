// src/components/expenses/ExpenseManager.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import ExpenseTable from "./ExpenseTable";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 10;

const ExpenseManager = () => {
  const [expenses, setExpenses] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    purpose: "",
    by: "",
    amount: "",
    description: "",
  });

  /* ======================
     Fetch Expenses
     ====================== */
  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${BASE_URL}/expense`, {
        params: { page, limit: LIMIT },
      });
      setExpenses(res.data.expenses || []);
      setCurrentPage(res.data.pagination?.currentPage || page);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "خطا در دریافت هزینه‌ها"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  /* ======================
     Submit (Add / Edit)
     ====================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      if (editingId) {
        await axios.put(`${BASE_URL}/expense/${editingId}`, form);
      } else {
        await axios.post(`${BASE_URL}/expense`, form);
      }

      setSuccessMessage(
        editingId ? "تغییرات ذخیره شد" : "هزینه جدید ثبت شد"
      );
      setTimeout(() => setSuccessMessage(null), 3000);

      resetForm();
      fetchExpenses(currentPage);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "خطا در ذخیره هزینه"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Edit
     ====================== */
  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      purpose: expense.purpose || "",
      by: expense.by || "",
      amount: expense.amount || "",
      description: expense.description || "",
    });
  };

  /* ======================
     Delete
     ====================== */
  const handleDelete = async (id) => {
    if (!window.confirm("آیا از حذف این هزینه مطمئن هستید؟")) return;

    try {
      await axios.delete(`${BASE_URL}/expense/${id}`);
      setSuccessMessage("هزینه حذف شد");
      setTimeout(() => setSuccessMessage(null), 2500);
      fetchExpenses(currentPage);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "خطا در حذف هزینه"
      );
    }
  };

  /* ======================
     Reset
     ====================== */
  const resetForm = () => {
    setForm({ purpose: "", by: "", amount: "", description: "" });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 space-y-8">
      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 hover:bg-green-100 rounded-lg transition"
              >
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          مدیریت هزینه‌ها
        </h1>
        <p className="text-gray-600">ثبت و مدیریت هزینه‌های سازمانی</p>

        {editingId && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <FaEdit />
              <span className="font-semibold">
                حالت ویرایش – هزینه #{editingId}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-3xl mx-auto">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mx-auto">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <FaPlus />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {editingId ? "ویرایش هزینه" : "افزودن هزینه جدید"}
              </h2>
              <p className="text-sm text-white/80">
                {editingId
                  ? "ویرایش اطلاعات هزینه"
                  : "ثبت اطلاعات هزینه جدید"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> هدف هزینه
                </label>
                <select
                  required
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition bg-white"
                >
                  <option value="">انتخاب کنید...</option>
                  <option value="خرید مواد">خرید مواد</option>
                  <option value="مصارف روزانه">مصارف روزانه</option>
                  <option value="کرایه جایداد">کرایه جایداد</option>
                  <option value="سایر">دیگر</option>
                </select>
              </div>

              {/* By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span> پرداخت کننده
                </label>
                <input
                  required
                  placeholder="مثال: مدیریت مالی"
                  value={form.by}
                  onChange={(e) => setForm({ ...form, by: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-red-500">*</span> مبلغ (افغانی)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ؋
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: parseInt(e.target.value || 0, 10),
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                توضیحات
              </label>
              <textarea
                placeholder="توضیحات بیشتر درباره هزینه (اختیاری)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2"
                >
                  <FaTimes /> لغو ویرایش
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 rounded-lg font-medium shadow-md transition flex items-center gap-2 ${
                  submitting
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
                }`}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    در حال ذخیره...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    {editingId ? "ذخیره تغییرات" : "ثبت هزینه"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <ExpenseTable
        expenses={expenses}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default ExpenseManager;