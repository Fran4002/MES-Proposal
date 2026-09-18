const BOM = require('../models/BOM');
const Inventory = require('../models/Inventory');

const populateBOM = (query) => {
  return query
    .populate('primaryProduct.item', 'itemCode name category unitOfMeasure unitCost quantityOnHand')
    .populate('secondaryOutputs.item', 'itemCode name category unitOfMeasure unitCost quantityOnHand')
    .populate('components.item', 'itemCode name category unitOfMeasure unitCost quantityOnHand')
    .populate('preferredWorkCenter', 'code name department type capacityPerHour hourlyRate status');
};

// GET /api/boms
exports.getBOMs = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { bomCode: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const boms = await populateBOM(BOM.find(filter)).sort({ bomCode: 1 });
    res.json({ success: true, count: boms.length, data: boms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/boms/:id
exports.getBOMById = async (req, res) => {
  try {
    const bom = await populateBOM(BOM.findById(req.params.id));
    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }
    res.json({ success: true, data: bom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/boms
exports.createBOM = async (req, res) => {
  try {
    const {
      bomCode,
      name,
      description,
      version,
      status,
      primaryProduct,
      secondaryOutputs,
      components,
      preferredWorkCenter,
      notes,
    } = req.body;

    // Check unique bomCode
    const existing = await BOM.findOne({ bomCode: bomCode?.trim()?.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A BOM with code "${bomCode}" already exists.`,
      });
    }

    // Validate primary product
    if (!primaryProduct || !primaryProduct.item) {
      return res.status(400).json({
        success: false,
        message: 'Primary produced product is required.',
      });
    }

    const productExists = await Inventory.findById(primaryProduct.item);
    if (!productExists) {
      return res.status(400).json({
        success: false,
        message: 'Specified primary product was not found in Inventory.',
      });
    }

    // Validate components
    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one input component is required in the Bill of Materials.',
      });
    }

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.item) {
        return res.status(400).json({
          success: false,
          message: `Component at row ${i + 1} must select an inventory item.`,
        });
      }
      if (!c.quantity || Number(c.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: `Component at row ${i + 1} must have a quantity greater than 0.`,
        });
      }
    }

    const bom = await BOM.create({
      bomCode,
      name,
      description,
      version: version || '1.0',
      status: status || 'ACTIVE',
      primaryProduct: {
        item: primaryProduct.item,
        quantity: Number(primaryProduct.quantity) || 1,
        unitOfMeasure: primaryProduct.unitOfMeasure || productExists.unitOfMeasure,
      },
      secondaryOutputs: Array.isArray(secondaryOutputs) ? secondaryOutputs : [],
      components,
      preferredWorkCenter: preferredWorkCenter || null,
      notes,
    });

    const populatedBOM = await populateBOM(BOM.findById(bom._id));
    res.status(201).json({ success: true, data: populatedBOM });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/boms/:id
exports.updateBOM = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.bomCode) {
      updateData.bomCode = updateData.bomCode.trim().toUpperCase();
      const existing = await BOM.findOne({
        bomCode: updateData.bomCode,
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `BOM code "${updateData.bomCode}" is already in use.`,
        });
      }
    }

    if (updateData.preferredWorkCenter === '') {
      updateData.preferredWorkCenter = null;
    }

    const bom = await BOM.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }

    const populatedBOM = await populateBOM(BOM.findById(bom._id));
    res.json({ success: true, data: populatedBOM });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/boms/:id
exports.deleteBOM = async (req, res) => {
  try {
    const { id } = req.params;
    const bom = await BOM.findByIdAndDelete(id);
    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM not found' });
    }
    res.json({ success: true, message: 'BOM deleted successfully', data: bom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

