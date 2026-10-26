import Swal from "sweetalert2";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Package-related API calls
export const packageService = {
  // Fetch all packages
  getAllPackages: async (page) => {
    const res = await axios.get(`${BASE_URL}/packages?page=${page}`);
    return res.data;
  }, searchPackages: async (name) => {
    const res = await axios.get(`${BASE_URL}/packages/search?name=${name}`);
    return res.data.data;
  },

  // Create new package
  createPackage: async (payload) => {
    console.log(payload);
    
    const res = await axios.post(`${BASE_URL}/packages`, payload);
    return res.data;
  },

  // Update package
  updatePackage: async (id, packageData) => {
    const res = await axios.put(`${BASE_URL}/packages/${id}`, packageData);
    return res.data;
  },

  // Delete package
  deletePackage: async (id) => {
    const res = await axios.delete(`${BASE_URL}/packages/${id}`);
    return res.data;
  },

};
// Zone/country-related API calls
export const zoneService = {
  // Fetch all zones/countries with pricing
  getAllZones: async () => {
    const res = await axios.get(`${BASE_URL}/zone/countries`);
    return res.data;
  },

  // Get price list by country and weight
  getPriceListByCountryAndWeight: async (weight, country) => {
    const res = await axios.get(
      `${BASE_URL}/priceList/lists?country=${country}&weight=${weight}`
    );
    console.log(res.data);

    return res.data;
  },

};
export const updatePackageLocation = async (id, location) => {
  try {
    // Confirm before updating
    const confirmResult = await Swal.fire({
      title: "تأیید تغییر مکان",
      text: `آیا می‌خواهید مکان بسته ${id} را به "${location}" تغییر دهید؟`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "بلی، تغییر بده",
      cancelButtonText: "خیر",
    });

    if (!confirmResult.isConfirmed) {
      return; // User canceled
    }

    // Call API
    const response = await axios.post(
      `${BASE_URL}/packages/updateLocation/${id}`,
      { location }
    );

    // Show success message
    await Swal.fire({
      title: "موفقیت آمیز",
      text: "مکان بسته با موفقیت تغییر یافت",
      icon: "success",
      confirmButtonText: "باشه",
    });
    console.log(response.data);

    return response.data;

  } catch (error) {
    console.error("Update Location Error:", error);

    // Show error message
    await Swal.fire({
      title: "خطا",
      text: error.response?.data?.error || "تغییر مکان موفق نبود",
      icon: "error",
      confirmButtonText: "باشه",
    });

    throw error;
  }
};


