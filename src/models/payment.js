const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  amount: { type: Number, required: true },
  MerchantRequestID: { type: String },
  CheckoutRequestID: { type: String },
  ResponseCode: { type: String },
  ResponseDescription: { type: String },
  CustomerMessage: { type: String },
  MpesaReceiptNumber: { type: String }, // added for callback
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
