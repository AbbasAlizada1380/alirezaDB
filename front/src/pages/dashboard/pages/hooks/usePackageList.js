import { useState, useEffect } from "react";
import { packageService } from "../../services/packageservice.js";
import { useSelector } from "react-redux";

export const usePackageList = (refreshTrigger, onEdit, onDelete) => {
  const token = useSelector((state) => state.user.accessToken);
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState(new Set());
  const [bulkLocation, setBulkLocation] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPackages = async (pageNumber) => {
    try {
      setLoading(true);
      const response = await packageService.getAll(pageNumber, limit, token);
      if (response.success) {
        setPackages(response.data);
        setMeta(response.meta);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };
  const locationLabels = {
    "cargo stock in kabul": "محموله در کابل",
    "in transit": "در حال انتقال",
    "at sorting facility": "در مرکز تفکیک",
    "out for delivery": "در حال تحویل",
    delivered: "تحویل داده شده",
    "returned to sender": "برگشت داده شده به فرستنده",
    "held at customs": "در گمرک متوقف شده",
    "lost in transit": "گم شده در مسیر",
  };
  const handleUpdateLocation = async (id, location) => {
    const res = await packageService.updateLocation(id, location);
    if (res.success) {
      alert("موقعیت بسته با موفقیت به‌روزرسانی شد ✅");
      fetchPackages(page);
    } else {
      alert("خطا در به‌روزرسانی موقعیت ❌");
    }
  };

  const handleBulkLocationUpdate = async () => {
    if (selectedPackages.size === 0) {
      alert("لطفاً حداقل یک بسته را انتخاب کنید");
      return;
    }

    if (!bulkLocation) {
      alert("لطفاً موقعیت جدید را انتخاب کنید");
      return;
    }

    setIsUpdating(true);
    try {
      const packageIds = Array.from(selectedPackages);
      const res = await packageService.updateBulkLocations(
        packageIds,
        bulkLocation
      );

      if (res.success) {
        alert(res.message);
        setSelectedPackages(new Set());
        setBulkLocation("");
        fetchPackages(page);
      } else {
        alert(res.message);
      }
    } catch (error) {
      alert("خطا در به‌روزرسانی موقعیت بسته‌ها");
      console.error("Bulk update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePackageSelect = (packageId) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPackages.size === packages.length) {
      setSelectedPackages(new Set());
    } else {
      const allPackageIds = packages.map((pkg) => pkg.id);
      setSelectedPackages(new Set(allPackageIds));
    }
  };

  const handlePrintBill = (pkg) => {
    setSelectedPackage(pkg);
    setIsBillOpen(true);
  };

  const handleCloseBill = () => {
    setIsBillOpen(false);
    setSelectedPackage(null);
  };

  useEffect(() => {
    fetchPackages(page);
    setSelectedPackages(new Set());
  }, [page, refreshTrigger]);

  return {
    // State
    packages,
    page,
    meta,
    loading,
    selectedPackage,
    isBillOpen,
    selectedPackages,
    bulkLocation,
    isUpdating,
    locationLabels,
    // Setters
    setPage,
    setBulkLocation,

    // Functions
    handleUpdateLocation,
    handleBulkLocationUpdate,
    handlePackageSelect,
    handleSelectAll,
    handlePrintBill,
    handleCloseBill,
    onEdit,
    onDelete,
  };
};
