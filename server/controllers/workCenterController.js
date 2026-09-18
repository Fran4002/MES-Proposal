const WorkCenter = require('../models/WorkCenter');
const BOM = require('../models/BOM');

// GET /api/work-centers
exports.getWorkCenters = async (req, res) => {
  try {
    const { status, type, department, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (type && type !== 'ALL') {
      filter.type = type;
    }
    if (department && department !== 'ALL') {
      filter.department = department;
    }
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const workCenters = await WorkCenter.find(filter).sort({ code: 1 });
    res.json({ success: true, count: workCenters.length, data: workCenters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/work-centers/:id
exports.getWorkCenterById = async (req, res) => {
  try {
    const workCenter = await WorkCenter.findById(req.params.id);
    if (!workCenter) {
      return res.status(404).json({ success: false, message: 'Work Center not found' });
    }
    res.json({ success: true, data: workCenter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/work-centers
exports.createWorkCenter = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      department,
      type,
      capacityPerHour,
      hourlyRate,
      status,
      currentJob,
    } = req.body;

    const existing = await WorkCenter.findOne({ code: code?.trim()?.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A work center with code "${code}" already exists.`,
      });
    }

    const workCenter = await WorkCenter.create({
      code,
      name,
      description,
      department,
      type,
      capacityPerHour: Number(capacityPerHour) || 0,
      hourlyRate: Number(hourlyRate) || 0,
      status,
      currentJob,
    });

    res.status(201).json({ success: true, data: workCenter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/work-centers/:id
exports.updateWorkCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
      const existing = await WorkCenter.findOne({
        code: updateData.code,
        _id: { $ne: id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Work center code "${updateData.code}" is already in use.`,
        });
      }
    }

    const workCenter = await WorkCenter.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!workCenter) {
      return res.status(404).json({ success: false, message: 'Work Center not found' });
    }

    res.json({ success: true, data: workCenter });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/work-centers/:id
exports.deleteWorkCenter = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if referenced in any BOM
    const bomUsage = await BOM.findOne({ preferredWorkCenter: id });
    if (bomUsage) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete work center because it is set as preferred work center in BOM "${bomUsage.bomCode}".`,
      });
    }

    const workCenter = await WorkCenter.findByIdAndDelete(id);
    if (!workCenter) {
      return res.status(404).json({ success: false, message: 'Work Center not found' });
    }

    res.json({ success: true, message: 'Work Center deleted successfully', data: workCenter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

