const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['RAW_MATERIAL', 'SUB_ASSEMBLY', 'FINISHED_GOOD', 'CONSUMABLE', 'BY_PRODUCT'],
      default: 'RAW_MATERIAL',
    },
    unitOfMeasure: {
      type: String,
      required: [true, 'Unit of measure is required'],
      default: 'pcs',
      trim: true,
    },
    quantityOnHand: {
      type: Number,
      default: 0,
      min: [0, 'Quantity on hand cannot be negative'],
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock level cannot be negative'],
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative'],
    },
    location: {
      type: String,
      default: 'Warehouse A',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to check if stock is low
inventorySchema.virtual('isLowStock').get(function () {
  return this.quantityOnHand <= this.minStockLevel;
});

inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);

