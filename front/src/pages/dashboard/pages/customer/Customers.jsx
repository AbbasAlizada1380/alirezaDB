import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../pagination/Pagination.jsx";
import {
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaBan,
  FaTimes,
  FaSpinner,
  FaFileInvoiceDollar,
  FaChevronDown,
  FaChevronUp,
  FaDownload,
} from "react-icons/fa";
import { downloadPermanentDebtorsPDF } from "./downloadPermanentDebtorsPDF";
import { useSelector } from "react-redux";
import CustomerBills from "./CustomerBills";
import CustomerBillsFilter from "./CustomerBillsFilter";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const LIMIT = 20;

const Customers = () => {
  const [downloadingDebtors, setDownloadingDebtors] = useState(false);
  const [customers, setCustomers] = useState([]);
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // ← new
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [billsCustomer, setBillsCustomer] = useState(null);
  const [form, setForm] = useState({
    fullname: "",
    phoneNumber: "",
    isActive: true,
  });

  /* ---------- Open / close bills for a customer ---------- */
  const handleToggleBills = (customer) => {
    setBillsCustomer((prev) => (prev?.id === customer.id ? null : customer));
  };

  const groupBillsByCustomer = (bills) => {
    const map = new Map();

    for (const b of bills) {
      if (b.customer == null) continue;
      const key = b.customer;

      if (!map.has(key)) {
        map.set(key, {
          customerId: b.customer,
          name: b.name || "—",
          phoneNumber: b.phoneNumber || "—",
          bills: [],
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0,
        });
      }

      const entry = map.get(key);
      entry.bills.push(b);

      const total = Number(b.total || 0);
      const paid = Array.isArray(b.receipt)
        ? b.receipt.reduce((s, n) => s + Number(n || 0), 0)
        : 0;
      const remaind = Number(b.remaind ?? total - paid);

      entry.totalAmount += total;
      entry.totalPaid += paid;
      entry.totalRemaining += remaind;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalRemaining - a.totalRemaining
    );
  };

  /* ======================
     Download permanent debtors PDF
  ====================== */
  const handleDownloadPermanentDebtors = async () => {
    try {
      setDownloadingDebtors(true);

      const res = await axios.get(`${BASE_URL}/bills`, {
        params: {
          page: 1,
          limit: 10000,
          status: "unpaid,partial",
          customerType: "permanent",
        },
      });

      const bills = res.data.bills || [];
      const permanent = groupBillsByCustomer(bills);

      if (permanent.length === 0) {
        alert("هیچ مشتری دائمی بدهکاری برای دانلود وجود ندارد");
        return;
      }

      downloadPermanentDebtorsPDF({
        permanent,
        filters: {},
      });
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message ||
        err.message ||
        "خطا در دریافت اطلاعات برای دانلود"
      );
    } finally {
      setDownloadingDebtors(false);
    }
  };

  /* ======================
     Fetch customers
  ====================== */
  const fetchCustomers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/customers?page=${page}&limit=${LIMIT}`
      );

      setCustomers(res.data.customers || []);
      setCurrentPage(res.data.pagination?.currentPage || page);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0); // ← set
      setError(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err.message ||
        "خطا در دریافت مشتریان"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
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
        await axios.put(`${BASE_URL}/customers/${editingId}`, form);
      } else {
        await axios.post(`${BASE_URL}/customers`, form);
      }

      resetForm();
      fetchCustomers(currentPage);
      setSuccessMessage(editingId ? "تغییرات ذخیره شد" : "مشتری جدید ثبت شد");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err.message ||
        "خطا در ذخیره اطلاعات"
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Edit
  ====================== */
  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({
      fullname: customer.fullname,
      phoneNumber: customer.phoneNumber || "",
      isActive: customer.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  /* ======================
     Delete
  ====================== */
  const handleDelete = async (id) => {
    if (!window.confirm("آیا از حذف این مشتری اطمینان دارید؟")) return;

    try {
      await axios.delete(`${BASE_URL}/customers/${id}`);
      if (billsCustomer?.id === id) setBillsCustomer(null);
      fetchCustomers(currentPage);
      setSuccessMessage("مشتری حذف شد");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err.message ||
        "خطا در حذف مشتری"
      );
    }
  };

  /* ======================
     Reset
  ====================== */
  const resetForm = () => {
    setForm({ fullname: "", phoneNumber: "", isActive: true });
    setEditingId(null);
    setIsModalOpen(false);
    setError(null);
  };

  const handleAddNew = () => {
    setForm({ fullname: "", phoneNumber: "", isActive: true });
    setEditingId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slideDown">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaCheckCircle className="text-green-600" />
              </div>
              <p className="flex-1 text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="p-1 hover:bg-green-100 rounded-lg transition-colors"
              >
                <FaTimes className="text-green-600 text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header row: title + actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaUsers className="text-primary text-lg" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">مدیریت مشتریان</h2>
            <p className="text-xs text-gray-500">
              {totalItems} مشتری ثبت شده
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Download permanent debtors PDF */}
          <button
            onClick={handleDownloadPermanentDebtors}
            disabled={downloadingDebtors}
            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="دانلود گزارش مشتریان دائمی بدهکار"
          >
            {downloadingDebtors ? (
              <>
                <FaSpinner className="animate-spin" />
                در حال آماده‌سازی...
              </>
            ) : (
              <>
                <FaDownload />
                دانلود PDF
              </>
            )}
          </button>

          <button
            onClick={handleAddNew}
            className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
          >
            <FaPlus />
            افزودن مشتری
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-primary to-primary/80">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  نام کامل
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  شماره تماس
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  وضعیت
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FaSpinner className="text-3xl text-primary animate-spin mb-3" />
                      <p className="text-gray-600">
                        در حال بارگذاری مشتریان...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : customers.length ? (
                customers.map((c) => {
                  const isShowingBills = billsCustomer?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${isShowingBills ? "bg-primary/5" : "hover:bg-primary/5"
                        } ${c.isActive === false ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-primary">
                          #{c.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {c.fullname}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        
                        >
                          {c.phoneNumber || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-700"
                            }`}
                        >
                          {c.isActive ? (
                            <>
                              <FaCheckCircle className="text-[10px]" />
                              فعال
                            </>
                          ) : (
                            <>
                              <FaBan className="text-[10px]" />
                              غیرفعال
                            </>
                          )}
                        </span>
                      </td>
                       <td className="px-6 py-4">
                        <div className="flex items-center  gap-2">
                          <button
                            onClick={() => handleToggleBills(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${isShowingBills
                                ? "bg-primary text-white hover:opacity-90"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                            title={isShowingBills ? "بستن بل‌ها" : "مشاهده بل‌ها"}
                          >
                            <FaFileInvoiceDollar className="text-[11px]" />
                            {isShowingBills ? "بستن" : "بل‌ها"}
                            {isShowingBills ? (
                              <FaChevronUp className="text-[9px]" />
                            ) : (
                              <FaChevronDown className="text-[9px]" />
                            )}
                          </button>

                          {currentUser?.role === "admin" && (
                            <>
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                                title="ویرایش"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="حذف"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                        <FaUsers className="text-primary text-2xl" />
                      </div>
                      <p className="text-gray-500 text-lg">
                        هیچ مشتری‌ای ثبت نشده است
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        برای شروع، روی «افزودن مشتری» کلیک کنید
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          <div className="border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
      </div>

      {/* Inline Customer Bills Panel */}
      {billsCustomer && (
        <div className="animate-fadeIn">
          <CustomerBills
            customer={billsCustomer}
            onClose={() => setBillsCustomer(null)}
          />
        </div>
      )}
      {billsCustomer && (
        <div className="animate-fadeIn">
          <CustomerBillsFilter customer={billsCustomer} />
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-full">
                    <FaUsers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">
                      {editingId ? "ویرایش مشتری" : "افزودن مشتری"}
                    </h2>
                    <p className="text-sm text-white/80">
                      {editingId
                        ? `ویرایش اطلاعات مشتری #${editingId}`
                        : "ثبت اطلاعات مشتری جدید"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="بستن"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Fullname */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="text-red-500">*</span> نام کامل
                  </label>
                  <input
                    required
                    placeholder="نام کامل مشتری"
                    value={form.fullname}
                    onChange={(e) =>
                      setForm({ ...form, fullname: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    disabled={submitting}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    شماره تماس
                  </label>
                  <input
                    placeholder="07XX XXX XXX"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition"
                    dir="ltr"
                    disabled={submitting}
                  />
                </div>

                {/* isActive Toggle */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${form.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                          }`}
                      >
                        {form.isActive ? <FaCheckCircle /> : <FaBan />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">
                          وضعیت مشتری
                        </div>
                        <div className="text-xs text-gray-500">
                          {form.isActive
                            ? "فعال — قابل استفاده در سفارشات"
                            : "غیرفعال — نمایش داده نمی‌شود"}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.isActive}
                        onChange={(e) =>
                          setForm({ ...form, isActive: e.target.checked })
                        }
                        disabled={submitting}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                  </label>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
                    disabled={submitting}
                  >
                    <FaTimes />
                    لغو
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-3 rounded-xl font-medium shadow-md transition flex items-center gap-2 ${submitting
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 text-white"
                      }`}
                  >
                    {submitting ? (
                      <>
                        <FaSpinner className="animate-spin h-4 w-4" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>{editingId ? "ذخیره تغییرات" : "ثبت مشتری"}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;