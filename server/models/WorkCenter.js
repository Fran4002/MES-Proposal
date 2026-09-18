const mongoose = require('mongoose');

const workCenterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Work center code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Work center name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      default: 'Production',
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['MACHINE', 'MANUAL_ASSEMBLY', 'QUALITY_CONTROL', 'PACKAGING', 'SURFACE_FINISH'],
      default: 'MACHINE',
    },
    capacityPerHour: {
      type: Number,
      default: 10,
      min: [0, 'Capacity cannot be negative'],
    },
    hourlyRate: {
      type: Number,
      default: 50,
      min: [0, 'Hourly rate cannot be negative'],
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RUNNING', 'MAINTENANCE', 'OFFLINE'],
      default: 'AVAILABLE',
    },
    currentJob: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WorkCenter', workCenterSchema);

