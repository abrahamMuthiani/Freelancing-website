const mongoose = require('mongoose');

// Define user schema
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'freelancer', 'client'],
    default: 'freelancer'
  },
  fieldOfWork: {
    type: String,
    default: ''
  },
  hoursAvailable: {
    type: Number,
    default: 0
  },
  experienceLevel: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  specificSkills: {
    type: [String],
    default: []
  },
  profilePictureId: {
    type: mongoose.Types.ObjectId,
    default: null
  },

  // Banning Information
  isBanned: {
    type: Boolean,
    default: false
  },
  banUntil: {
    type: Date,
    default: null
  },
  banReason: {
    type: String,
    default: ''
  },

  // Optional - user active status (soft delete)
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Create user model
const User = mongoose.model('User', userSchema);

// Default admin for optional use (password must be hashed before saving)
const defaultAdmin = {
  firstName: 'Dregga',
  lastName: 'Ruben',
  username: 'admin',
  email: 'admin@gmail.com',
  phone: '+254700000000',
  password: 'Admin123', // Hash this in server.js before inserting
  role: 'admin',
  fieldOfWork: 'Administration',
  hoursAvailable: 40,
  experienceLevel: 'Expert',
  country: 'Kenya',
  city: 'Nairobi',
  specificSkills: ['Management', 'Monitoring']
};

module.exports = {
  User,
  defaultAdmin
};
