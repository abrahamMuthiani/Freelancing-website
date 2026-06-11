const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    skills: {
      type: [String],
      required: true,
    },
    attachments: [
      {
        fileId: String,
        fileName: String,
        fileUrl: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "open", "in-progress", "completed"],
      default: "pending",
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // projects must have a client
    },
    //  ADDED: Store client name as fallback for old projects
    createdBy: {
      type: String,
      trim: true,
    },
    proposals: [
      {
        freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        message: String,
        amount: Number,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);