const express = require("express");
const axios = require("axios");
const Payment = require("../models/payment");

const router = express.Router();

// --- M-Pesa Sandbox Credentials ---
const MPESA_CONSUMER_KEY = "QwICaoM7RSATlcapzx3wxRxXvi0Gc3ymWBxMKACPPL3vk8uK";
const MPESA_CONSUMER_SECRET = "09e3f2Ase8JzXuofsTy3bQGHcSgMFBTbyZzLnyLSLCF9LSuzj6qH2g5ACkh6JFiN";
const MPESA_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const MPESA_SHORTCODE = "174379"; // Paybill Sandbox
const CALLBACK_URL = "https://your-ngrok-id.ngrok.io/api/mpesa/callback"; // Must be HTTPS and publicly accessible

// --- Helper: Generate Access Token ---
async function getAccessToken() {
  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
    const { data } = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return data.access_token;
  } catch (error) {
    console.error(" Failed to generate M-Pesa access token:", error.response?.data || error.message);
    throw new Error("Failed to generate access token");
  }
}

// --- STK Push Route ---
router.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: "Phone and amount are required" });
    }

    const formattedPhone = phone.startsWith("254") ? phone : phone.replace(/^0/, "254");
    const token = await getAccessToken();

    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString("base64");

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: "Innobridge Payment",
      TransactionDesc: "Payment for project",
    };

    const { data } = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save to MongoDB
    const paymentRecord = new Payment({
      phone: formattedPhone,
      amount,
      MerchantRequestID: data.MerchantRequestID || null,
      CheckoutRequestID: data.CheckoutRequestID || null,
      ResponseCode: data.ResponseCode || null,
      ResponseDescription: data.ResponseDescription || "N/A",
      CustomerMessage: data.CustomerMessage || "N/A",
      status: "pending",
    });

    await paymentRecord.save();

    res.json({ success: true, message: "STK Push sent successfully", data: paymentRecord });
  } catch (error) {
    console.error(" M-Pesa STK Push Error:", error.response?.data || error.message);

    const failedPayment = new Payment({
      phone: req.body.phone || "N/A",
      amount: req.body.amount || 0,
      ResponseDescription: "Payment failed",
      CustomerMessage: error.response?.data?.errorMessage || error.message,
      status: "failed",
    });

    await failedPayment.save();

    res.status(500).json({
      success: false,
      message: "STK Push failed",
      details: error.response?.data || error.message,
    });
  }
});

// --- Callback Route ---
router.post("/callback", async (req, res) => {
  console.log("📞 M-Pesa Callback Received:", JSON.stringify(req.body, null, 2));

  try {
    const callbackData = req.body.Body?.stkCallback;
    if (!callbackData) return res.json({ success: true });

    const payment = await Payment.findOne({ CheckoutRequestID: callbackData.CheckoutRequestID });
    if (payment) {
      payment.status = callbackData.ResultCode === 0 ? "paid" : "failed";
      payment.CustomerMessage = callbackData.ResultDesc || "No description";

      const items = callbackData.CallbackMetadata?.Item || [];
      payment.MpesaReceiptNumber = items.find(i => i.Name === "MpesaReceiptNumber")?.Value || null;

      await payment.save();
      console.log(` Payment ${payment.status}: ${payment.MpesaReceiptNumber || "N/A"}`);
    } else {
      console.warn("⚠️ Payment not found for CheckoutRequestID:", callbackData.CheckoutRequestID);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(" Callback Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
