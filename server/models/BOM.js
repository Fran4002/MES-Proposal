const mongoose = require('mongoose');

const bomComponentSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Component item reference is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Component quantity is required'],
    min: [0.0001, 'Quantity must be greater than 0'],
  },
  unitOfMeasure: {
    type: String,
    default: 'pcs',
    trim: true,
  },
  scrapFactor: {
    type: Number,
    default: 0,
    min: [0, 'Scrap factor cannot be negative'],
    max: [100, 'Scrap factor cannot exceed 100%'],
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
});

const bomSecondaryOutputSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'Secondary output item reference is required'],
  },
  type: {
    type: String,
    enum: ['CO_PRODUCT', 'BY_PRODUCT'],
    default: 'BY_PRODUCT',
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Output quantity is required'],
    min: [0.0001, 'Quantity must be greater than 0'],
    default: 1,
  },
  unitOfMeasure: {
    type: String,
    default: 'pcs',
    trim: true,
  },
  costAllocationPercent: {
    type: Number,
    default: 0,
    min: [0, 'Cost allocation percent cannot be negative'],
    max: [100, 'Cost allocation percent cannot exceed 100%'],
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
});

const bomSchema = new mongoose.Schema(
  {
    bomCode: {
      type: String,
      required: [true, 'BOM code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'BOM name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    version: {
      type: String,
      default: '1.0',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'OBSOLETE'],
      default: 'ACTIVE',
    },
    // Primary Product (Main Finished Good or Subassembly produced)
    primaryProduct: {
      item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory',
        required: [true, 'Primary produced product item is required'],
      },
      quantity: {
        type: Number,
        default: 1,
        min: [0.0001, 'Produced quantity must be greater than 0'],
      },
      unitOfMeasure: {
        type: String,
        default: 'pcs',
        trim: true,
      },
    },
    // Secondary Outputs (Co-Products or By-Products generated simultaneously)
    secondaryOutputs: [bomSecondaryOutputSchema],
    // Inputs (Raw Materials, Parts, and Subassemblies consumed)
    components: {
      type: [bomComponentSchema],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0;
        },
        message: 'A Bill of Materials must include at least one input component',
      },
    },
    preferredWorkCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkCenter',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BOM', bomSchema);

