import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DigitalSection from "./DigitalSection";
import OffsetSection from "./OffsetSection";
import BillSummary from "./BillSummary";
import PrintOrderBill from "./PrintOrderBill";
import SearchBar from "../searching/SearchBar.jsx"; 
import { FaCheck, FaSpinner, FaSearch, FaUndo, FaUserPlus, FaTrash } from "react-icons/fa";
import { ImCross } from "react-icons/im";
import Pagination from "../../pagination/Pagination.jsx";
import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} from "../services/ServiceManager.js";
import {
  FaUser,
  FaPhone,
  FaMoneyBillWave,
  FaFileInvoice,
  FaSave,
  FaEye,
  FaPrint,
  FaEdit,
  FaTimes,
  FaIdCard,
} from "react-icons/fa";
import { useSelector } from "react-redux";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const Orders = () => {
  const { currentUser } = useSelector((state) => state.user);

  // Default empty digital item
  const defaultDigitalItem = {
    name: "",
    quantity: null,
    height: null,
    weight: null,
    area: null,
    price_per_unit: null,
    money: null,
  };

  // Default empty offset item
  const defaultOffsetItem = {
    name: "",
    quantity: null,
    price_per_unit: null,
    money: null,
  };

  // Helper function to check if a digital item is filled
  const isDigitalItemFilled = (item) => {
    return (
      item.name.trim() !== "" ||
      item.quantity > 0 ||
      item.height > 0 ||
      item.weight > 0 ||
      item.price_per_unit > 0 ||
      item.money > 0
    );
  };

  // Helper function to check if an offset item is filled
  const isOffsetItemFilled = (item) => {
    return (
      item.name.trim() !== "" ||
      item.quantity > 0 ||
      item.price_per_unit > 0 ||
      item.money > 0
    );
  };

  // Helper function to filter out empty items before sending to backend
  const prepareRecordForSubmit = (record) => {
    const filteredDigital = record.digital.filter(isDigitalItemFilled);
    const filteredOffset = record.offset.filter(isOffsetItemFilled);

    return {
      ...record,
      digital: filteredDigital,
      offset: filteredOffset,
    };
  };

  const [record, setRecord] = useState({
    customerType: "temporary", // ✅ Added customer type
    customer: { name: "", phone_number: "" },
    customerId: null, // ✅ For permanent customers
    digital: Array(5).fill().map(() => ({ ...defaultDigitalItem })),
    offset: Array(5).fill().map(() => ({ ...defaultOffsetItem })),
    total_money_digital: 0,
    total_money_offset: 0,
    total: 0,
    digitalId: 0,
    recip: null,
    remained: 0,
  });

  // ✅ Customer Selection States
  const [permanentCustomers, setPermanentCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullname: "", phoneNumber: "", isActive: true });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orders, setOrders] = useState([]);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeSection, setActiveSection] = useState("digital");
  const [editMode, setEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [savedOrderForPrint, setSavedOrderForPrint] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState(0);
  const SUBMISSION_COOLDOWN = 3000; 

  const searchBarRef = useRef();

  // ✅ Load Permanent Customers
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await axios.get(`${BASE_URL}/customers/active?page=1&limit=200`);
      setPermanentCustomers(res.data.customers || []);
    } catch (err) {
      console.error("load customers error:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const fetchOrders = async (page = 1) => {
    try {
      const data = await getOrders(page, 20);
      setOrders(data.orders);
      setCurrentPage(data.currentPage || page);
      setTotalPages(data.totalPages || 1);
      setIsSearching(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      Swal.fire("خطا!", "دریافت لیست سفارشات با مشکل مواجه شد.", "error");
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, []);

  useEffect(() => {
    if (!record) return;

    const totalDigital = (record.digital || []).reduce((sum, d) => sum + Number(d.money || 0), 0);
    const totalOffset = (record.offset || []).reduce((sum, o) => sum + Number(o.money || 0), 0);
    const total = totalDigital + totalOffset;

    setRecord((prev) => ({
      ...prev,
      total_money_digital: Number(totalDigital.toFixed(2)),
      total_money_offset: Number(totalOffset.toFixed(2)),
      total: Number(total.toFixed(2)),
      remained: Number((total - Number(prev.recip || 0)).toFixed(2)),
    }));
  }, [record?.digital, record?.offset, record?.recip]);

  // ✅ Handle Customer Type Switch
  const handleCustomerTypeChange = (type) => {
    setRecord((prev) => ({
      ...prev,
      customerType: type,
      customer: { name: "", phone_number: "" }, // Reset customer data
      customerId: null,
    }));
  };

  // ✅ Handle selecting a permanent customer from dropdown
  const handlePermanentCustomerSelect = (e) => {
    const id = e.target.value;
    const cust = permanentCustomers.find((c) => String(c.id) === String(id));
    
    setRecord((prev) => ({
      ...prev,
      customerId: id ? Number(id) : null,
      customer: {
        name: cust?.fullname || "",
        phone_number: cust?.phoneNumber || "",
        id: id ? Number(id) : null, // Store ID inside JSON for backend queries
      },
    }));
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setRecord({
      ...record,
      customer: { ...record.customer, [name]: value },
    });
  };

  const handleDigitalIdChange = (e) => {
    setRecord({ ...record, digitalId: e.target.value });
  };

  const handleRecipChange = (e) => {
    setRecord({ ...record, recip: Number(e.target.value || 0) });
  };

  // ✅ Inline Create Permanent Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerError(null);

    if (!newCustomer.fullname.trim()) {
      setCustomerError("نام کامل الزامی است");
      return;
    }

    setCreatingCustomer(true);
    try {
      const res = await axios.post(`${BASE_URL}/customers`, {
        fullname: newCustomer.fullname.trim(),
        phoneNumber: newCustomer.phoneNumber?.trim() || null,
        isActive: Boolean(newCustomer.isActive),
      });

      const created = res.data.customer || res.data;
      setPermanentCustomers((prev) => [created, ...prev]);

      // Auto-select the newly created customer
      setRecord((prev) => ({
        ...prev,
        customerType: "permanent",
        customerId: created.id,
        customer: {
          name: created.fullname,
          phone_number: created.phoneNumber || "",
          id: created.id,
        },
      }));

      setNewCustomer({ fullname: "", phoneNumber: "", isActive: true });
      setShowAddCustomer(false);
    } catch (err) {
      setCustomerError(err?.response?.data?.message || err.message || "خطا در ثبت مشتری");
    } finally {
      setCreatingCustomer(false);
    }
  };


  const saveRecord = async (shouldPrint = false) => {
    if (isSubmitting) {
      Swal.fire({ icon: "info", title: "در حال پردازش", text: "لطفاً صبر کنید...", timer: 2000, showConfirmButton: false });
      return;
    }

    const now = Date.now();
    if (now - lastSubmittedTime < SUBMISSION_COOLDOWN) {
      const remainingTime = Math.ceil((SUBMISSION_COOLDOWN - (now - lastSubmittedTime)) / 1000);
      Swal.fire({ icon: "warning", title: "لطفاً صبر کنید", text: `${remainingTime} ثانیه دیگر صبر کنید`, timer: 2000, showConfirmButton: false });
      return;
    }

    const recordToSubmit = prepareRecordForSubmit(record);
    const hasDigitalItems = recordToSubmit.digital.length > 0;
    const hasOffsetItems = recordToSubmit.offset.length > 0;

    if (!hasDigitalItems && !hasOffsetItems) {
      Swal.fire("خطا", "لطفاً حداقل یک محصول دیجیتال یا افست را پر کنید", "error");
      return;
    }

    if (!record.customer.name.trim()) {
       Swal.fire("خطا", "لطفاً نام مشتری را وارد کنید", "error");
       return;
    }

    if (record.customerType === "permanent" && !record.customerId) {
       Swal.fire("خطا", "لطفاً یک مشتری دائم انتخاب کنید", "error");
       return;
    }

    const recordHash = JSON.stringify(recordToSubmit);
    const lastSubmissionKey = "lastOrderSubmission";
    const lastSubmission = localStorage.getItem(lastSubmissionKey);

    if (lastSubmission === recordHash && !editMode) {
      Swal.fire({
        icon: "warning",
        title: "تکرار ثبت",
        text: "این سفارش قبلاً ثبت شده است. آیا مطمئنید که می‌خواهید دوباره ثبت کنید؟",
        showCancelButton: true,
        confirmButtonText: "بله، ثبت کن",
        cancelButtonText: "لغو",
      }).then((result) => {
        if (result.isConfirmed) {
          proceedWithSubmission(recordToSubmit, shouldPrint);
        }
      });
      return;
    }

    await proceedWithSubmission(recordToSubmit, shouldPrint);
  };

  const proceedWithSubmission = async (recordToSubmit, shouldPrint) => {
    setIsSubmitting(true);
    setLastSubmittedTime(Date.now());

    const recordHash = JSON.stringify(recordToSubmit);
    localStorage.setItem("lastOrderSubmission", recordHash);

    try {
      let savedOrder;

      if (editMode) {
        savedOrder = await updateOrder(editingOrderId, recordToSubmit);
      } else {
        savedOrder = await createOrder(recordToSubmit);
      }

      if (isSearching) {
        clearSearch();
      } else {
        fetchOrders(currentPage);
      }

      if (shouldPrint) {
        setSavedOrderForPrint(savedOrder);
        setSelectedOrder(savedOrder);
        setIsBillOpen(true);
        setAutoPrint(true);
      } else {
        resetForm();
      }

      setTimeout(() => {
        localStorage.removeItem("lastOrderSubmission");
      }, SUBMISSION_COOLDOWN);
    } catch (err) {
      console.error("Submission error:", err);
      Swal.fire({
        icon: "error",
        title: "خطا در ثبت",
        text: "خطایی در ثبت سفارش رخ داده است. لطفاً دوباره تلاش کنید.",
        confirmButtonText: "باشه",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRecord({
      customerType: "temporary",
      customer: { name: "", phone_number: "" },
      customerId: null,
      digital: Array(5).fill().map(() => ({ ...defaultDigitalItem })),
      offset: Array(5).fill().map(() => ({ ...defaultOffsetItem })),
      total_money_digital: 0,
      total_money_offset: 0,
      total: 0,
      recip: 0,
      remained: 0,
      digitalId: null,
    });
    setEditMode(false);
    setEditingOrderId(null);
    setActiveSection("digital");
    setSavedOrderForPrint(null);
    setShowAddCustomer(false);
    localStorage.removeItem("lastOrderSubmission");
  };

  const handleEditOrder = (order) => {
    const cleanedDigital = (order.digital || [])
      .filter(isDigitalItemFilled)
      .map(item => ({
        name: item.name || "",
        quantity: item.quantity || null,
        height: item.height || null,
        weight: item.weight || null,
        area: item.area || null,
        price_per_unit: item.price_per_unit || null,
        money: item.money || null,
      }));

    const cleanedOffset = (order.offset || [])
      .filter(isOffsetItemFilled)
      .map(item => ({
        name: item.name || "",
        quantity: item.quantity || null,
        price_per_unit: item.price_per_unit || null,
        money: item.money || null,
      }));

    const digitalForEdit = [
      ...cleanedDigital,
      ...Array(Math.max(0, 5 - cleanedDigital.length)).fill().map(() => ({ ...defaultDigitalItem }))
    ].slice(0, 5);

    const offsetForEdit = [
      ...cleanedOffset,
      ...Array(Math.max(0, 5 - cleanedOffset.length)).fill().map(() => ({ ...defaultOffsetItem }))
    ].slice(0, 5);

    setRecord({
      customerType: order.customerType || "temporary",
      customer: {
        name: order.customer?.name || order.name || "",
        phone_number: order.customer?.phone_number || order.phone_number || "",
        id: order.customer?.id || null,
      },
      customerId: order.customer?.id || null,
      digital: digitalForEdit,
      offset: offsetForEdit,
      total_money_digital: order.total_money_digital || 0,
      total_money_offset: order.total_money_offset || 0,
      total: order.total || 0,
      recip: order.recip || 0,
      remained: order.remained || 0,
      digitalId: order.digitalId || null,
    });

    setEditMode(true);
    setEditingOrderId(order.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrder(orderId);
      Swal.fire("حذف شد!", "سفارش با موفقیت حذف شد.", "success");
      if (isSearching) {
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
        setSearchResults((prev) => prev.filter((order) => order.id !== orderId));
      } else {
        fetchOrders(currentPage);
      }
    } catch (err) {
      Swal.fire("خطا!", "حذف سفارش موفقیت‌آمیز نبود.", "error");
    }
  };

  const handleViewBill = (order) => {
    setSelectedOrder(order);
    setIsBillOpen(true);
    setAutoPrint(false);
  };

  const handleCloseBill = () => {
    setIsBillOpen(false);
    setSelectedOrder(null);
    setAutoPrint(false);
    if (savedOrderForPrint) resetForm();
  };

  const handlePrintBill = (order) => {
    setSelectedOrder(order);
    setIsBillOpen(true);
    setAutoPrint(true);
  };

  const handleSaveAndPrint = () => {
    saveRecord(true);
  };

  const handleSearchResults = (results) => {
    if (results && results.length > 0) {
      setSearchResults(results);
      setIsSearching(true);
      setOrders(results);
    } else {
      setIsSearching(false);
      setOrders([]);
      setSearchResults([]);
      Swal.fire({
        icon: "info",
        title: "نتیجه‌ای یافت نشد",
        text: "هیچ سفارشی مطابق با جستجوی شما یافت نشد.",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const clearSearch = () => {
    if (searchBarRef.current) searchBarRef.current.reset();
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    fetchOrders(currentPage);
  };

  const onPageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      if (!isSearching) fetchOrders(pageNumber);
    }
  };

  const filledDigitalCount = record.digital.filter(isDigitalItemFilled).length;
  const filledOffsetCount = record.offset.filter(isOffsetItemFilled).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">سیستم مدیریت سفارشات</h1>
        <p className="text-gray-600">مدیریت سفارش‌های مشتریان و خدمات چاپی</p>
        {editMode && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <FaEdit className="text-lg" />
              <span className="font-semibold">حالت ویرایش - در حال ویرایش سفارش #{editingOrderId}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-lg px-6 pb-6 pt-3 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          {editMode && (
            <button onClick={resetForm} className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
              <FaTimes className="text-sm" /> لغو ویرایش
            </button>
          )}
        </div>

        {/* ✅ CUSTOMER SELECTION SECTION (Like AddBill) */}
        <div className="rounded-xl border border-gray-200 p-4 space-y-4 mb-6 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <FaUser className="text-cyan-800" />
            <h3 className="font-semibold text-gray-800">اطلاعات مشتری</h3>
          </div>

          <div className="flex gap-2 max-w-md">
            <button
              type="button"
              onClick={() => handleCustomerTypeChange("temporary")}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                record.customerType === "temporary"
                  ? "bg-cyan-800 text-white shadow-sm"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              مشتری موقت
            </button>
            <button
              type="button"
              onClick={() => handleCustomerTypeChange("permanent")}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition ${
                record.customerType === "permanent"
                  ? "bg-cyan-800 text-white shadow-sm"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              مشتری دائم
            </button>
          </div>

          {record.customerType === "permanent" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> انتخاب مشتری
              </label>

              <div className="flex items-stretch gap-2 max-w-2xl">
                <select
                  value={record.customerId || ""}
                  onChange={handlePermanentCustomerSelect}
                  disabled={loadingCustomers}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-800 focus:border-cyan-800 transition bg-white disabled:bg-gray-100"
                  required
                >
                  <option value="">
                    {loadingCustomers ? "در حال بارگذاری..." : "انتخاب مشتری..."}
                  </option>
                  {permanentCustomers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.fullname} {c.phoneNumber ? `— ${c.phoneNumber}` : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomer((prev) => !prev);
                    setCustomerError(null);
                  }}
                  className="px-4 py-3 bg-cyan-800/10 text-cyan-800 rounded-xl hover:bg-cyan-800/20 transition flex items-center gap-2 whitespace-nowrap font-medium"
                  title="افزودن مشتری جدید"
                >
                  <FaUserPlus /> مشتری جدید
                </button>
              </div>

              {showAddCustomer && (
                <div className="rounded-xl border border-cyan-800/30 bg-cyan-50 p-4 space-y-3 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-cyan-800">افزودن مشتری دائم جدید</h4>
                    <button type="button" onClick={() => setShowAddCustomer(false)} className="p-1 text-gray-500 hover:text-red-600 rounded">
                      <FaTimes className="text-xs" />
                    </button>
                  </div>

                  {customerError && <div className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200">{customerError}</div>}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">نام کامل *</label>
                      <input
                        value={newCustomer.fullname}
                        onChange={(e) => setNewCustomer({ ...newCustomer, fullname: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-800 bg-white"
                        disabled={creatingCustomer}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">شماره تماس</label>
                      <input
                        value={newCustomer.phoneNumber}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-800 bg-white"
                        dir="ltr"
                        disabled={creatingCustomer}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      disabled={creatingCustomer}
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                        creatingCustomer ? "bg-gray-400 text-white" : "bg-cyan-800 text-white hover:bg-cyan-900"
                      }`}
                    >
                      {creatingCustomer ? <><FaSpinner className="animate-spin" /> در حال ثبت...</> : <><FaSave /> ثبت مشتری</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700 mb-2">نام مشتری</label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  placeholder="نام مشتری را وارد کنید"
                  value={record.customer.name || ""}
                  onChange={handleCustomerChange}
                  className="w-full px-4 py-3 pl-12 border bg-gray-200 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-all duration-200 text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting || record.customerType === "permanent"}
                />
                <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700 mb-2">شماره تماس</label>
              <div className="relative">
                <input
                  type="text"
                  name="phone_number"
                  placeholder="شماره تماس را وارد کنید"
                  value={record.customer.phone_number || ""}
                  onChange={handleCustomerChange}
                  className="w-full px-4 py-3 pl-12 border bg-gray-200 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-all duration-200 text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting || record.customerType === "permanent"}
                />
                <FaPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-base font-medium text-gray-700 mb-2">شناسه دیجیتال</label>
              <div className="relative">
                <input
                  type="text"
                  name="digitalId"
                  placeholder="شناسه دیجیتال را وارد کنید"
                  value={record.digitalId || ""}
                  onChange={handleDigitalIdChange}
                  className="w-full px-4 py-3 pl-12 border bg-gray-200 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 transition-all duration-200 text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting}
                />
                <FaIdCard className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Toggle Buttons */}
        <div className="flex gap-4 mb-6 mt-4">
          <button
            onClick={() => setActiveSection("digital")}
            disabled={isSubmitting}
            className={`flex items-center gap-3 px-6 py-3 rounded-md font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
              activeSection === "digital" ? "bg-cyan-800 text-white shadow-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaPrint className="text-lg" /> چاپ دیجیتال
          </button>
          <button
            onClick={() => setActiveSection("offset")}
            disabled={isSubmitting}
            className={`flex items-center gap-3 px-6 py-3 rounded-md font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
              activeSection === "offset" ? "bg-cyan-800 text-white shadow-blue-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <FaPrint className="text-lg" /> چاپ افست
          </button>
        </div>

        {/* Dynamic Section Display */}
        <div className="transition-all duration-300">
          {activeSection === "digital" && (
            <DigitalSection record={record} setRecord={setRecord} isSubmitting={isSubmitting} />
          )}
          {activeSection === "offset" && (
            <OffsetSection record={record} setRecord={setRecord} isSubmitting={isSubmitting} />
          )}
        </div>
      </div>

      <div><BillSummary record={record} /></div>

      {/* Payment Section */}
      <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-100">
        <div className="flex gap-x-6">
          <div className="flex items-center gap-x-4 flex-1">
            <div className="space-y-2 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ دریافتی</label>
              <div className="relative w-full">
                <input
                  type="number"
                  placeholder="مبلغ دریافتی را وارد کنید"
                  value={record.recip}
                  onChange={handleRecipChange}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 focus:border-transparent transition-all duration-200 bg-gray-200 text-gray-800 placeholder-gray-400"
                  disabled={isSubmitting}
                />
                <FaMoneyBillWave className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">مبلغ باقیمانده</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="مبلغ باقیمانده"
                  value={record.remained}
                  readOnly
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-800 focus:border-transparent transition-all duration-200 bg-gray-200 text-gray-800 placeholder-gray-400 cursor-not-allowed"
                />
                <FaMoneyBillWave className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => saveRecord(false)}
              disabled={isSubmitting || !record.customer.name.trim() || (filledDigitalCount === 0 && filledOffsetCount === 0)}
              className={`flex items-center gap-x-3 px-4 py-3.5 rounded-md font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                editMode ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" : "flex items-center gap-2 text-sm bg-cyan-800 text-white px-4 py-3.5 rounded-md font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl"
              } ${!record.customer.name.trim() || (filledDigitalCount === 0 && filledOffsetCount === 0) || isSubmitting ? "opacity-50 cursor-not-allowed" : "text-white"}`}
            >
              {isSubmitting ? <><FaSpinner className="animate-spin text-lg" /> در حال ثبت...</> : <><FaSave className="text-lg" /> {editMode ? "ویرایش اطلاعات" : "ذخیره اطلاعات"}</>}
            </button>

            <button
              onClick={handleSaveAndPrint}
              disabled={isSubmitting || !record.customer.name.trim() || (filledDigitalCount === 0 && filledOffsetCount === 0)}
              className={`flex items-center gap-x-2 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-3.5 rounded-md font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 ${
                !record.customer.name.trim() || (filledDigitalCount === 0 && filledOffsetCount === 0) || isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? <><FaSpinner className="animate-spin text-lg" /> در حال ثبت...</> : <><FaPrint className="text-lg" /> ذخیره و چاپ</>}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleViewBill(record)}
              disabled={isSubmitting}
              className={`flex items-center gap-x-2 text-sm bg-purple-700 text-white px-4 py-3.5 rounded-md font-semibold transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FaEye className="text-lg" /> مشاهده بیل
            </button>
          </div>
        </div>

        {isSubmitting && (
          <div className="mt-5 flex items-center gap-2 text-blue-600">
            <FaSpinner className="animate-spin" />
            <span className="text-sm">در حال ثبت سفارش، لطفاً صبر کنید...</span>
          </div>
        )}

        {(!record.customer.name.trim() || (filledDigitalCount === 0 && filledOffsetCount === 0)) && (
          <div className="mt-5">
            <p className="text-red-600 text-sm">
              {!record.customer.name.trim() ? "لطفاً نام مشتری را وارد کنید" : "لطفاً حداقل یک محصول دیجیتال یا افست را پر کنید"}
            </p>
          </div>
        )}
      </div>

      {/* Orders Table - With Search Bar */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <FaFileInvoice className="text-cyan-800 text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">لیست سفارشات</h2>
              <p className="text-gray-600 text-sm">
                {isSearching ? <span className="text-cyan-700">نتایج جستجو: {orders.length} سفارش یافت شد</span> : "مدیریت و مشاهده تمام سفارشات ثبت شده"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <SearchBar ref={searchBarRef} onResults={handleSearchResults} query={searchQuery} onQueryChange={setSearchQuery} />
            {isSearching && (
              <button onClick={clearSearch} className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                <FaUndo className="text-sm" /> نمایش همه
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border border-gray-300">
            <thead className="bg-cyan-800 text-gray-50">
              <tr>
                <th className="border border-gray-100 px-4 py-2"> شماره بیل</th>
                <th className="border border-gray-100 px-4 py-2">شناسه دیجیتال</th>
                <th className="border border-gray-100 px-4 py-2">نام مشتری</th>
                <th className="border border-gray-100 px-4 py-2">شماره تماس</th>
                <th className="border border-gray-100 px-4 py-2">مجموع</th>
                <th className="border border-gray-100 px-4 py-2">دریافتی</th>
                <th className="border border-gray-100 px-4 py-2">باقیمانده</th>
                <th className="border border-gray-100 px-4 py-2">تاریخ</th>
                <th className="border border-gray-100 px-4 py-2">تحویلی</th>
                <th className="border border-gray-300 px-4 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${order.isDelivered && order.remained === 0 && "bg-blue-100"}`}>
                    <td className="border border-gray-300 px-4 py-2">{order.id}</td>
                    <td className="border border-gray-300 px-4 py-2 font-mono">{order.digitalId || "-"}</td>
                    <td className="border border-gray-300 px-4 py-2">{order.customer?.name || order.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{order.customer?.phone_number || order.phone_number}</td>
                    <td className="border font-semibold border-gray-300 px-4 py-2">{order.total}</td>
                    <td className="border font-semibold text-green-600 border-gray-300 px-4 py-2">{order.recip}</td>
                    <td className={`border font-semibold border-gray-300 px-4 py-2 ${order.remained === 0 ? "text-black" : "text-red-500"}`}>{order.remained}</td>
                    <td className="border border-gray-300 px-4 py-2">{new Date(order.createdAt).toLocaleDateString("fa-AF")}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <div className="w-full flex items-center justify-center text-cyan-800">
                        {order.isDelivered ? <FaCheck /> : <ImCross />}
                      </div>
                    </td>
                    <td className="border-b border-gray-300 flex items-center justify-center py-2">
                      <div className="flex gap-x-2">
                        <button onClick={() => handleViewBill(order)} disabled={isSubmitting} className={`flex items-center justify-center h-8 w-8 cursor-pointer border border-cyan-800 rounded-md transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <FaEye className="text-cyan-800" size={20} />
                        </button>
                        <button onClick={() => handleEditOrder(order)} disabled={isSubmitting} className={`flex items-center justify-center h-8 w-8 cursor-pointer border border-cyan-800 rounded-md transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <FaEdit className="text-green-600" size={20} />
                        </button>
                        <button onClick={() => handlePrintBill(order)} disabled={isSubmitting} className={`flex items-center justify-center h-8 w-8 cursor-pointer border border-cyan-800 rounded-md transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}>
                          <FaPrint className="text-blue-600" size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-gray-500 py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {isSearching ? <><FaSearch className="text-gray-400 text-3xl" /><span className="text-lg">نتیجه‌ای برای جستجوی شما یافت نشد</span><button onClick={clearSearch} className="mt-2 text-cyan-800 hover:text-cyan-900 font-medium">مشاهده همه سفارشات</button></> : "هیچ سفارشی وجود ندارد"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!isSearching && orders.length > 0 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          )}
        </div>
      </div>

      {isBillOpen && (
        <div className="relative">
          <PrintOrderBill isOpen={isBillOpen} onClose={handleCloseBill} order={selectedOrder} autoPrint={autoPrint} />
        </div>
      )}
    </div>
  );
};

export default Orders;