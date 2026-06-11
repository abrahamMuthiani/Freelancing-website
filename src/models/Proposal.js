const mongoose = require("mongoose");

// ============================
// Proposal Schema
// ============================
const proposalSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
      trim: true,
    },
    bidAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    estimatedDeliveryDays: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    messageThread: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: String,
        sentAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ============================
// Export Model
// ============================
module.exports = mongoose.model("Proposal", proposalSchema);
