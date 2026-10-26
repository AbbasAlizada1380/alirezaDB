import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getMenuItems = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/menu`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Error fetching menu items:", err);
    throw err;
  }
};
