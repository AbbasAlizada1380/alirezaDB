import { useState } from "react";
import { FaUsers, FaUserClock, FaExclamationTriangle, FaUserTie } from "react-icons/fa";
import Customers from "./Customers";
import PermanentDebtors from "./PermanentDebtors.jsx";
import CustomerBills from "./CustomerBills";
import AllCustomerDebt from "./AllCustomerDebt"; // ← new
import TemporaryAccounts from "./TemporaryAccounts"; // ← new

export default function CustomersPage() {
  const [activeTab, setActiveTab] = useState("permanent"); // "permanent" | "permanentCAccount" | "temporaryCAccount" | "debt"
  const [refreshKey, setRefreshKey] = useState(0);

  /* Selected customer whose bills we're viewing (from either tab) */
  const [billsCustomer, setBillsCustomer] = useState(null);

  const openBills = (customer) => setBillsCustomer(customer);
  const closeBills = () => setBillsCustomer(null);

  const handlePaid = () => {
    // After a payment, refresh all tabs so totals stay accurate
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-xl">
            <FaUsers className="text-primary text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              مدیریت مشتریان
            </h1>
            <p className="text-xs text-gray-500">
              مشاهده و مدیریت مشتریان دائمی و موقت
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Permanent tab */}
          <button
            onClick={() => setActiveTab("permanent")}
            className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "permanent"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                activeTab === "permanent" ? "bg-white/20" : "bg-primary/10"
              }`}
            >
              <FaUsers
                className={`text-sm ${
                  activeTab === "permanent" ? "text-white" : "text-primary"
                }`}
              />
            </div>
            <span>مشتریان دائمی</span>
          </button>

          {/* ← New: Temporary account tab */}
          <button
            onClick={() => setActiveTab("temporaryCAccount")}
            className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "temporaryCAccount"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                activeTab === "temporaryCAccount" ? "bg-white/20" : "bg-emerald-100"
              }`}
            >
              <FaUserTie
                className={`text-sm ${
                  activeTab === "temporaryCAccount" ? "text-white" : "text-emerald-600"
                }`}
              />
            </div>
            <span> مشتریان موقت</span>
          </button>

          {/* Debts tab */}
          <button
            onClick={() => setActiveTab("debt")}
            className={`group flex-1 flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "debt"
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm"
                : "text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                activeTab === "debt" ? "bg-white/20" : "bg-yellow-100"
              }`}
            >
              <FaExclamationTriangle
                className={`text-sm ${
                  activeTab === "debt" ? "text-white" : "text-yellow-700"
                }`}
              />
            </div>
            <span>بدهی مشتریان</span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="animate-fadeIn">
        {activeTab === "permanent" && (
          <Customers onViewBills={openBills} refreshKey={refreshKey} />
        )}
        {activeTab === "temporaryCAccount" && (
          <TemporaryAccounts
            refreshKey={refreshKey}
            onViewBills={openBills}
          />
        )}
        {activeTab === "debt" && (
          <AllCustomerDebt
            refreshKey={refreshKey}
            onViewBills={openBills}
          />
        )}
      </div>

      {/* Customer bills modal (shared by all tabs) */}
      {billsCustomer && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
          <div className="w-full max-w-6xl">
            <CustomerBills
              customer={billsCustomer}
              onClose={closeBills}
              onPaid={handlePaid}
            />
          </div>
        </div>
      )}
    </div>
  );
}