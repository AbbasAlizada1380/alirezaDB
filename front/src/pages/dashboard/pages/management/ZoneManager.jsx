import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaGlobe,
  FaFlag,
  FaSave,
  FaTimes,
  FaSearch,
  FaList,
  FaRegFlag,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaSpinner,
} from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function ZoneManager() {
  const [zones, setZones] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    countries: [],
  });
  const [countryInput, setCountryInput] = useState("");
  const [editCountryIndex, setEditCountryIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  // Loading states
  const [loading, setLoading] = useState({
    fetch: true,
    submit: false,
    delete: null, // null or ID of zone being deleted
    edit: null, // null or ID of zone being edited
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    setLoading((prev) => ({ ...prev, fetch: true }));
    try {
      const res = await axios.get(`${BASE_URL}/zone/`);
      setZones(res.data);
    } catch (err) {
      console.error("Error fetching zones:", err);
      Swal.fire({
        icon: "error",
        title: "خطا!",
        text: "دریافت اطلاعات مناطق با مشکل مواجه شد",
      });
    } finally {
      setLoading((prev) => ({ ...prev, fetch: false }));
    }
  };

  const openModal = () => {
    setFormData({ name: "", countries: [] });
    setCountryInput("");
    setIsEdit(false);
    setModalOpen(true);
  };

  const editModal = (item) => {
    setIsEdit(true);
    setEditId(item.id);
    setFormData({
      name: item.name,
      countries: item.countries,
    });
    setCountryInput("");
    setEditCountryIndex(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "نام منطقه ضروری است",
        text: "لطفاً نام منطقه را وارد کنید",
      });
      return;
    }

    // ✅ Auto-add country if user typed something but didn't click "افزودن"
    if (countryInput.trim() !== "") {
      formData.countries.push(countryInput.trim());
      setCountryInput("");
    }

    setLoading((prev) => ({ ...prev, submit: true }));

    try {
      const payload = {
        name: formData.name.trim(),
        countries: formData.countries,
      };

      if (isEdit) {
        await axios.patch(`${BASE_URL}/zone/${editId}`, payload);
      } else {
        await axios.post(`${BASE_URL}/zone/`, payload);
      }

      fetchZones();
      setModalOpen(false);

      Swal.fire({
        icon: "success",
        title: isEdit ? "بروزرسانی موفق!" : "ایجاد موفق!",
        text: isEdit
          ? "منطقه با موفقیت بروزرسانی شد"
          : "منطقه جدید با موفقیت ایجاد شد",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "خطا!",
        text:
          err.response?.data?.message || "مشکلی در ارتباط با سرور رخ داده است",
      });
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const deleteZone = async (id) => {
    Swal.fire({
      title: "آیا مطمئن هستید؟",
      text: "این منطقه به همراه تمام اطلاعات مربوطه حذف خواهد شد!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "بله، حذف شود",
      cancelButtonText: "لغو",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading((prev) => ({ ...prev, delete: id }));
        try {
          await axios.delete(`${BASE_URL}/zone/${id}`);
          fetchZones();
          Swal.fire("حذف شد!", "منطقه با موفقیت حذف شد", "success");
        } catch (err) {
          Swal.fire("خطا!", "مشکلی در حذف منطقه رخ داد", "error");
        } finally {
          setLoading((prev) => ({ ...prev, delete: null }));
        }
      }
    });
  };

  const filteredZones = zones.filter(
    (zone) =>
      zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      zone.countries.some((country) =>
        country.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen  p-4 md:p-6">
      <div className="">
        {/* HEADER SECTION */}
        <div className="mb-8 bg-primary rounded-md shadow-md p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <FaGlobe className="text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  مدیریت مناطق حمل و نقل
                </h1>
                <p className="text-blue-100 mt-1">
                  تعریف و مدیریت مناطق جغرافیایی و کشورها
                </p>
              </div>
            </div>
            <button
              onClick={openModal}
              className="px-6 py-3 bg-gray-100 text-primary font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading.fetch}
            >
              <FaPlus />
              اضافه کردن منطقه جدید
            </button>
          </div>
        </div>

        {/* STATS & SEARCH SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-md shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary">تعداد مناطق</div>
                <div className="text-2xl font-bold text-blue-900">
                  {loading.fetch ? (
                    <FaSpinner className="animate-spin text-blue-500" />
                  ) : (
                    zones.length
                  )}
                </div>
              </div>
              <FaGlobe className="text-3xl text-primary opacity-70" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary">مجموع کشورها</div>
                <div className="text-2xl font-bold text-green-900">
                  {loading.fetch ? (
                    <FaSpinner className="animate-spin text-primary" />
                  ) : (
                    zones.reduce(
                      (total, zone) => total + zone.countries.length,
                      0
                    )
                  )}
                </div>
              </div>
              <FaFlag className="text-3xl text-primary opacity-70" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-primary">میانگین کشورها</div>
                <div className="text-2xl font-bold text-purple-900">
                  {loading.fetch ? (
                    <FaSpinner className="animate-spin text-primary" />
                  ) : zones.length > 0 ? (
                    (
                      zones.reduce(
                        (total, zone) => total + zone.countries.length,
                        0
                      ) / zones.length
                    ).toFixed(1)
                  ) : (
                    0
                  )}
                </div>
              </div>
              <FaList className="text-3xl text-primary opacity-70" />
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white rounded-md shadow-md p-6 mb-6">
          <label className=" text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FaSearch className="text-primary" />
            جستجوی مناطق و کشورها
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="جستجو بر اساس نام منطقه یا کشور..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-4 pr-10 border bg-gray-100 border-gray-300 rounded-md focus:ring-1 focus:ring-primary outline-none transition-all"
              disabled={loading.fetch}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* ZONES TABLE */}
        <div className="bg-white rounded-md shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FaGlobe className="text-primary" />
              لیست مناطق
              {loading.fetch ? (
                <FaSpinner className="animate-spin text-blue-500" />
              ) : searchTerm ? (
                <span className="text-sm font-normal text-gray-600">
                  (نتایج جستجو: {filteredZones.length} مورد)
                </span>
              ) : null}
            </h3>
          </div>

          {loading.fetch ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <FaSpinner className="text-4xl text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600">در حال بارگذاری مناطق...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="py-4 px-6 text-right  text-gray-700">
                      <div className="flex items-center gap-2">نام منطقه</div>
                    </th>
                    <th className="py-4 px-6 text-right  text-gray-700">
                      <div className="flex items-center gap-2">کشورها</div>
                    </th>
                    <th className="py-4 px-6 text-right  text-gray-700">
                      <div className="flex items-center gap-2">
                        تعداد کشورها
                      </div>
                    </th>
                    <th className="py-4 px-6 text-right  text-gray-700">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FaGlobe className="text-4xl text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg">
                            منطقه‌ای یافت نشد
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            {searchTerm
                              ? "نتیجه‌ای برای جستجوی شما یافت نشد"
                              : "هنوز منطقه‌ای ثبت نشده است"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredZones.map((zone) => (
                      <tr
                        key={zone.id}
                        className="hover:bg-gray-50 odd:bg-gray-100 even:bg-white transition-colors group"
                      >
                        <td className="py-2 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center">
                              <FaGlobe className="text-primary" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">
                                {zone.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                منطقه ID: {zone.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-6">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {zone.countries.slice(0, 4).map((country, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-200"
                              >
                                <FaRegFlag className="text-xs" />
                                {country}
                              </span>
                            ))}
                            {zone.countries.length > 4 && (
                              <span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-sm">
                                +{zone.countries.length - 4} کشور دیگر
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-bold text-primary">
                                {zone.countries.length}
                              </span>
                            </div>
                            <span className="text-gray-600">کشور</span>
                          </div>
                        </td>

                        <td className="py-2 px-6">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editModal(zone)}
                              className="px-4 py-2  text-blue-600 rounded-xl hover:from-blue-200 hover:to-blue-300 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                              disabled={loading.delete === zone.id}
                            >
                              {loading.edit === zone.id ? (
                                <>
                                  <FaSpinner className="animate-spin" />
                                </>
                              ) : (
                                <>
                                  <FaEdit size={24} />
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => deleteZone(zone.id)}
                              className="px-4 py-2  text-red-600  transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                              disabled={
                                loading.delete === zone.id ||
                                loading.edit === zone.id
                              }
                            >
                              {loading.delete === zone.id ? (
                                <>
                                  <FaSpinner className="animate-spin" />
                                </>
                              ) : (
                                <>
                                  <FaTrash size={20} />
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-t-2xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      {isEdit ? <FaEdit /> : <FaPlus />}
                    </div>
                    <h2 className="text-xl font-bold">
                      {isEdit ? "ویرایش منطقه" : "ایجاد منطقه جدید"}
                    </h2>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
                    disabled={loading.submit}
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                <p className="text-blue-100 text-sm mt-2">
                  {isEdit
                    ? "اطلاعات منطقه را ویرایش کنید"
                    : "اطلاعات منطقه جدید را وارد کنید"}
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Zone Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaGlobe className="text-blue-500" />
                    نام منطقه
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100"
                    placeholder="مثال: اروپا، آسیا، خلیج..."
                    required
                    disabled={loading.submit}
                  />
                </div>

                {/* Countries Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FaFlag className="text-green-500" />
                      لیست کشورها
                    </label>
                    <span className="text-xs text-gray-500">
                      {formData.countries.length} کشور
                    </span>
                  </div>

                  {/* Add/Edit Country Input */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={countryInput}
                        onChange={(e) => setCountryInput(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all disabled:bg-gray-100"
                        placeholder="نام کشور را وارد کنید..."
                        disabled={loading.submit}
                      />
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    {editCountryIndex === null ? (
                      <button
                        onClick={() => {
                          if (!countryInput.trim()) {
                            Swal.fire({
                              icon: "warning",
                              title: "نام کشور ضروری است",
                              text: "لطفاً نام کشور را وارد کنید",
                            });
                            return;
                          }
                          setFormData({
                            ...formData,
                            countries: [
                              ...formData.countries,
                              countryInput.trim(),
                            ],
                          });
                          setCountryInput("");
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={loading.submit}
                      >
                        <FaPlus />
                        افزودن
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const updated = [...formData.countries];
                          updated[editCountryIndex] = countryInput.trim();
                          setFormData({ ...formData, countries: updated });
                          setCountryInput("");
                          setEditCountryIndex(null);
                        }}
                        className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={loading.submit}
                      >
                        <FaSave />
                        بروزرسانی
                      </button>
                    )}
                  </div>

                  {/* Countries List */}
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2">
                    {formData.countries.length === 0 ? (
                      <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-xl">
                        <FaFlag className="text-3xl text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">
                          هنوز کشوری اضافه نشده است
                        </p>
                      </div>
                    ) : (
                      formData.countries.map((country, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <FaRegFlag className="text-emerald-500" />
                            <span className="font-medium">{country}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setCountryInput(country);
                                setEditCountryIndex(index);
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-600 rounded-lg hover:from-blue-200 hover:to-blue-300 transition-all flex items-center gap-1 disabled:opacity-70"
                              disabled={loading.submit}
                            >
                              <FaEdit className="text-xs" />
                              ویرایش
                            </button>
                            <button
                              onClick={() => {
                                const filtered = formData.countries.filter(
                                  (_, i) => i !== index
                                );
                                setFormData({
                                  ...formData,
                                  countries: filtered,
                                });
                              }}
                              className="px-3 py-1 bg-gradient-to-r from-red-100 to-red-200 text-red-600 rounded-lg hover:from-red-200 hover:to-red-300 transition-all flex items-center gap-1 disabled:opacity-70"
                              disabled={loading.submit}
                            >
                              <FaTrash className="text-xs" />
                              حذف
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex justify-between">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 disabled:opacity-70"
                    disabled={loading.submit}
                  >
                    <FaTimes />
                    لغو
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={loading.submit}
                  >
                    {loading.submit ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        {isEdit ? "در حال بروزرسانی..." : "در حال ذخیره..."}
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {isEdit ? "بروزرسانی منطقه" : "ذخیره منطقه"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
