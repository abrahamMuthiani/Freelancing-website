const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  budget: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    trim: true
  },
  deadline: {
    type: Date,
    required: true
  },
  skillCategory: {
    type: String,
    required: true,
    trim: true
  },
  specificSkills: {
    type: [String],
    default: []
  },
  attachments: [{
    type: mongoose.Types.ObjectId,
    ref: 'uploads.files'
  }],
  createdBy: {
    type: String, // Store user email instead of ObjectId
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'open', 'in-progress', 'closed'],
    default: 'pending'
  }
}, { timestamps: true }); // <-- Adds createdAt and updatedAt automatically

module.exports = mongoose.model('Project', projectSchema);
