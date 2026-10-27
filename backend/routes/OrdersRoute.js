// routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  searchOrders,
  updateOrderProperties,
  getOrdersByDateRange,
  // ✅ SPECIFIC CONTROLLERS
  payPermanentCustomer,
  getTemporaryDebtors,
  addPaymentToOrder,
  getCustomerTypeReport, // ✅ NEW REPORT CONTROLLER
} from "../Controllers/OrdersController.js";

const OrdersRout = express.Router();

/* =========================================================
   SPECIFIC / NAMED ROUTES (Must be defined before /:id)
   ========================================================= */
OrdersRout.get("/search", searchOrders);
OrdersRout.get("/download", getOrdersByDateRange);

// ✅ Debtors & Reports
OrdersRout.get("/debtors/temporary", getTemporaryDebtors); // Matches frontend URL
OrdersRout.get("/reports/customer-type/:customerType", getCustomerTypeReport); // ✅ New Report Route

// ✅ Payments
OrdersRout.post("/pay/permanent", payPermanentCustomer);
OrdersRout.post("/:id/pay", addPaymentToOrder); 

/* =========================================================
   DYNAMIC / ID ROUTES
   ========================================================= */
OrdersRout.post("/", createOrder);
OrdersRout.get("/", getOrders);

OrdersRout.get("/:id", getOrderById);
OrdersRout.put("/:id", updateOrder);
OrdersRout.patch("/:id", updateOrderProperties);
OrdersRout.delete("/:id", deleteOrder);

export default OrdersRout;