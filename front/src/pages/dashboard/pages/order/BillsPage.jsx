import { useState } from "react";
import {
  FaFileInvoiceDollar,
  FaUserClock,
  FaPlus,
} from "react-icons/fa";
import AddBill from "./AddBill";
import BillsTable from "./bills/BillsTable";
import TemporaryAccounts from "../customer/TemporaryAccounts";

export default function BillsPage() {
  const [activeTab, setActiveTab] = useState("bills"); // "bills" | "temporary"
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ---------- Form handlers ---------- */
  const openAdd = () => {
    setEditingBill(null);
    setShowForm(true);
  };

  const openEdit = (bill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBill(null);
  };

  const handleSuccess = () => {
    closeForm();
    setRefreshKey((k) => k + 1); // refresh both tabs
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaFileInvoiceDollar className="text-primary text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              مدیریت بل‌ها
            </h1>
            <p className="text-xs text-gray-500">
              ثبت و پیگیری بل‌ها و حساب مشتریان
            </p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:opacity-90 transition flex items-center gap-2 shadow-sm self-start md:self-auto"
        >
          <FaPlus />
          افزودن بل
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* All bills tab */}
          <button
            onClick={() => setActiveTab("bills")}
            className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${activeTab === "bills"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
          >
            <div
              className={`p-2 rounded-lg ${activeTab === "bills" ? "bg-white/20" : "bg-primary/10"
                }`}
            >
              <FaFileInvoiceDollar
                className={`text-sm ${activeTab === "bills" ? "text-white" : "text-primary"
                  }`}
              />
            </div>
            <span>همه بل‌ها</span>
          </button>

          {/* Temporary customer accounts tab */}
          <button
            onClick={() => setActiveTab("temporary")}
            className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${activeTab === "temporary"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
          >
            <div
              className={`p-2 rounded-lg ${activeTab === "temporary" ? "bg-white/20" : "bg-red-100"
                }`}
            >
              <FaUserClock
                className={`text-sm ${activeTab === "temporary" ? "text-white" : "text-red-600"
                  }`}
              />
            </div>
            <span>حساب مشتریان موقت</span>
          </button>
        </div>
      </div>

      {/* Add / Edit modal — available from either tab */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-4xl">
            <AddBill
              editingBill={editingBill}
              onSuccess={handleSuccess}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="animate-fadeIn">
        {activeTab === "bills" && (
          <BillsTable refreshKey={refreshKey} onEdit={openEdit} />
        )}

        {activeTab === "temporary" && (
          <TemporaryAccounts refreshKey={refreshKey} onEdit={openEdit} />
        )}
      </div>
    </div>
  );
}
