import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Edit3,
  Trash2,
  PlusCircle,
  CheckCircle,
  XCircle,
  List,
} from "lucide-react";
import { FaGlobe } from "react-icons/fa";
import { FaRegEdit } from "react-icons/fa";

export default function TransitWayManager() {
  const [transitWays, setTransitWays] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BASE_URL;

  // Fetch All TransitWays
  const fetchTransitWays = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/transitWay`);
      setTransitWays(res.data);
    } catch (err) {
      console.error("Error fetching TransitWays:", err);
      Swal.fire({
        icon: "error",
        title: "خطا",
        text: "در دریافت اطلاعات مشکل پیش آمد",
        confirmButtonText: "باشه",
        confirmButtonColor: "#3b82f6",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitWays();
  }, []);

  // Create or Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire({
        icon: "error",
        title: "خطا",
        text: "نام طریق ترانزیت نمی‌تواند خالی باشد",
        confirmButtonText: "باشه",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editId) {
        await axios.patch(`${BASE_URL}/transitWay/${editId}`, { name });
        Swal.fire({
          icon: "success",
          title: "موفقیت",
          text: "طریق ترانزیت با موفقیت بروزرسانی شد",
          confirmButtonText: "باشه",
          confirmButtonColor: "#10b981",
        });
      } else {
        await axios.post(`${BASE_URL}/transitWay`, { name });
        Swal.fire({
          icon: "success",
          title: "موفقیت",
          text: "طریق ترانزیت جدید اضافه شد",
          confirmButtonText: "باشه",
          confirmButtonColor: "#10b981",
        });
      }

      setName("");
      setEditId(null);
      fetchTransitWays();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "خطا",
        text: err.response?.data?.message || "مشکلی پیش آمد",
        confirmButtonText: "باشه",
        confirmButtonColor: "#3b82f6",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Edit button
  const handleEdit = (item) => {
    setEditId(item.id);
    setName(item.name);
    // Smooth scroll to form
    document
      .getElementById("form-section")
      .scrollIntoView({ behavior: "smooth" });
  };

  // Delete
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "آیا مطمئن هستید؟",
      text: "این عمل قابل بازگشت نیست!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "بله، حذف شود",
      cancelButtonText: "لغو",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
      background: "#f8fafc",
      customClass: {
        title: "font-bold text-lg",
        confirmButton: "px-4 py-2 rounded-lg font-medium",
        cancelButton: "px-4 py-2 rounded-lg font-medium",
      },
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`${BASE_URL}/transitWay/${id}`);
        Swal.fire({
          icon: "success",
          title: "حذف شد!",
          text: "طریق ترانزیت با موفقیت حذف شد",
          confirmButtonText: "باشه",
          confirmButtonColor: "#10b981",
        });
        fetchTransitWays();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "خطا",
          text: "حذف انجام نشد",
          confirmButtonText: "باشه",
          confirmButtonColor: "#3b82f6",
        });
      }
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditId(null);
    setName("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="">
        {/* Header */}
        <div className="mb-8 bg-primary rounded-md shadow-md p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <List className="text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  مدیریت طریق‌های ترانزیت
                </h1>
                <p className="text-blue-100 mt-1">
                  در این بخش می‌توانید طریق‌های ترانزیت را مدیریت، اضافه، ویرایش
                  و حذف نمایید.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <div
              id="form-section"
              className="bg-white rounded-md shadow-md p-6 sticky top-6"
            >
              <div className="flex items-center mb-6">
                <div
                  className={`p-2 rounded-lg ${
                    editId
                      ? "bg-green-100 text-green-500"
                      : "bg-blue-100 text-primary"
                  }`}
                >
                  {editId ? (
                    <Edit3 className="w-6 h-6" />
                  ) : (
                    <PlusCircle className="w-6 h-6" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-800 mr-3">
                  {editId ? "ویرایش طریق ترانزیت" : "اضافه کردن طریق ترانزیت"}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group">
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-md
                    focus:outline-none  focus:ring-1 ring-primary
                    transition-all duration-300 text-gray-800 placeholder-transparent
                    hover:border-gray-300 peer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام طریق ترانزیت"
                    id="transit-name"
                  />
                  <label
                    htmlFor="transit-name"
                    className="absolute right-3 top-3 px-2 bg-gray-100 text-gray-500 
                    transition-all duration-300 transform -translate-y-6 scale-90 
                    origin-top-right peer-placeholder-shown:translate-y-0 
                    peer-placeholder-shown:scale-100 peer-focus:bg-white peer-focus:-translate-y-6 
                    peer-focus:scale-90 peer-focus:text-primary pointer-events-none"
                  >
                    نام طریق ترانزیت
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 flex items-center justify-center gap-2 
                    ${editId ? "bg-green-500" : "bg-primary"} 
                    text-white py-3 px-4 rounded-md font-semibold 
                    transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : editId ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        بروزرسانی
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5" />
                        ایجاد جدید
                      </>
                    )}
                  </button>

                  {editId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-4 py-3 
                      bg-red-500 text-white 
                      rounded-xl font-semibold transition-all duration-300 
                      hover:from-gray-600 hover:to-gray-700 cursor-pointer
                      shadow-lg hover:shadow-xl disabled:opacity-50 
                      disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <XCircle className="w-5 h-5" />
                      لغو
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-md shadow-md overflow-hidden">
              {/* Table Header */}
              <div className="p-6 border-b border-gray-200 ">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <List className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        طریق‌ های ترانزیت
                      </h2>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mt-1">
                      مجموع: {transitWays.length} مورد
                    </p>
                  </div>
                  {isLoading && (
                    <div className="flex items-center text-blue-600">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm font-medium">
                        در حال بارگذاری...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-2 px-6 text-right font-semibold text-gray-700 border-b border-gray-200 min-w-[120px]">
                        آی‌دی
                      </th>
                      <th className="py-2 px-6 text-right font-semibold text-gray-700 border-b border-gray-200 min-w-[200px]">
                        نام طریق ترانزیت
                      </th>
                      <th className="py-2 px-6 text-right font-semibold text-gray-700 border-b border-gray-200 min-w-[180px]">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transitWays.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`transition-all duration-300 hover:bg-gray-50
                        ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="py-3 px-6 border-b border-gray-200">
                          <span className=" text-gray-700 ">{item.id}</span>
                        </td>
                        <td className="py-3 px-6 border-b border-gray-200">
                          <div className="flex items-center">
                            <span className="text-gray-800 font-medium">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-6 border-b border-gray-200">
                          <div className="flex items-center gap-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-green-500 px-2"
                            >
                              <FaRegEdit className="" size={24} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 px-2"
                            >
                              <Trash2 className="" size={24} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {transitWays.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <div
                      className="w-24 h-24 mx-auto mb-4 flex items-center justify-center 
                    bg-gradient-to-r from-gray-100 to-gray-200 rounded-full"
                    >
                      <List className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                      موردی یافت نشد
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      هنوز طریق ترانزیتی اضافه نکرده‌اید. برای شروع، فرم سمت چپ
                      را پر کنید.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Stats Bar */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/10 rounded-md p-4 ">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">تعداد کل</p>
                <p className="text-2xl font-bold text-gray-800">
                  {transitWays.length}
                </p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-lg">
                <List className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-primary/10 rounded-md p-4 ">
            {" "}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">در حال ویرایش</p>
                <p className="text-2xl font-bold text-gray-800">
                  {editId ? "1" : "0"}
                </p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center bg-green-100 rounded-lg">
                <Edit3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-primary/10 rounded-md p-4 ">
            {" "}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">وضعیت</p>
                <p className="text-lg font-bold text-gray-800">
                  {isLoading ? "در حال بارگذاری..." : "آماده"}
                </p>
              </div>
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
