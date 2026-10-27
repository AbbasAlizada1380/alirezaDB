import express from "express";
import {
  createBill,
  getBills,
  getBillById,
  updateBill,
  updateBillProperties,
  addPayment,
  deleteBill,
  searchBills,
  getTemporaryDebtors,
  payPermanentCustomer,
} from "../../Controllers/orders/BillController.js";

const BillRoute = express.Router();

BillRoute.post("/", createBill);
BillRoute.get("/", getBills);
BillRoute.get("/search", searchBills);      // must be before "/:id"
BillRoute.get("/temporary-debtors", getTemporaryDebtors);
BillRoute.post("/pay-permanent", payPermanentCustomer);   // ← before /:id
BillRoute.get("/:id", getBillById);
BillRoute.put("/:id", updateBill);
BillRoute.patch("/:id", updateBillProperties);
BillRoute.post("/:id/payment", addPayment); // add a payment receipt
BillRoute.delete("/:id", deleteBill);
export default BillRoute;