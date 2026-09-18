const Inventory = require('../models/Inventory');
const BOM = require('../models/BOM');

// GET /api/inventory
exports.getInventory = async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const filter = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { itemCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await Inventory.find(filter).sort({ itemCode: 1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/inventory/:id
exports.getItemById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/inventory
exports.createItem = async (req, res) => {
  try {
    const {
      itemCode,
      name,
      description,
      category,
      unitOfMeasure,
      quantityOnHand,
      minStockLevel,
      unitCost,
      location,
      status,
    } = req.body;

    const existing = await Inventory.findOne({ itemCode: itemCode?.trim()?.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An item with code "${itemCode}" already exists.`,
      });
    }

    const item = await Inventory.create({
      itemCode,
      name,
      description,
      category,
      unitOfMeasure,
      quantityOnHand: Number(quantityOnHand) || 0,
      minStockLevel: Number(minStockLevel) || 0,
      unitCost: Number(unitCost) || 0,
      location,
      status,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/inventory/:id
exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.itemCode) {
      updateData.itemCode = updateData.itemCode.trim().toUpperCase();
      const existing = await Inventory.findOne({
        itemCode: updateData.itemCode,
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Item code "${updateData.itemCode}" is already in use by another item.`,
        });
      }
    }

    const item = await Inventory.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/inventory/:id
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item is used in any BOM (primary product or components)
    const bomUsage = await BOM.findOne({
      $or: [
        { 'primaryProduct.item': id },
        { 'secondaryOutputs.item': id },
        { 'components.item': id },
      ],
    });

    if (bomUsage) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete item because it is referenced in Bill of Materials "${bomUsage.bomCode}" (${bomUsage.name}). Remove it from the BOM first.`,
      });
    }

    const item = await Inventory.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted successfully', data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

