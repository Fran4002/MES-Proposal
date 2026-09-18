const Inventory = require('../models/Inventory');
const WorkCenter = require('../models/WorkCenter');
const BOM = require('../models/BOM');

// POST /api/seed
exports.seedData = async (req, res) => {
  try {
    // Clear existing collections
    await BOM.deleteMany({});
    await WorkCenter.deleteMany({});
    await Inventory.deleteMany({});

    // 1. Seed Inventory
    const inventoryItems = await Inventory.insertMany([
      {
        itemCode: 'RAW-ALUM-6061',
        name: 'Aluminum Billet 6061-T6',
        description: 'Aircraft grade 6061 aluminum alloy stock for CNC machining',
        category: 'RAW_MATERIAL',
        unitOfMeasure: 'kg',
        quantityOnHand: 450,
        minStockLevel: 100,
        unitCost: 8.5,
        location: 'Warehouse A - Rack 01',
        status: 'ACTIVE',
      },
      {
        itemCode: 'RAW-CF-SHEET',
        name: 'Carbon Fiber Plate 3mm 3K Twill',
        description: 'High rigidity carbon fiber composite panel for frame arms',
        category: 'RAW_MATERIAL',
        unitOfMeasure: 'pcs',
        quantityOnHand: 180,
        minStockLevel: 50,
        unitCost: 42.0,
        location: 'Warehouse A - Rack 04',
        status: 'ACTIVE',
      },
      {
        itemCode: 'RAW-COP-WIRE',
        name: 'Silicone Motor Wire 20AWG',
        description: 'High-temperature flexible copper wiring for motor harnesses',
        category: 'RAW_MATERIAL',
        unitOfMeasure: 'm',
        quantityOnHand: 1200,
        minStockLevel: 300,
        unitCost: 0.45,
        location: 'Warehouse B - Bin 12',
        status: 'ACTIVE',
      },
      {
        itemCode: 'PART-BRUSHLESS-MTR',
        name: 'Brushless DC Motor 2207 1800KV',
        description: 'High-thrust precision brushless motor',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 120,
        minStockLevel: 40,
        unitCost: 18.5,
        location: 'Warehouse B - Shelf 02',
        status: 'ACTIVE',
      },
      {
        itemCode: 'PART-ESC-4IN1',
        name: '4-in-1 55A BLHeli_32 ESC',
        description: 'Electronic speed controller module with current telemetry',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 42,
        minStockLevel: 20,
        unitCost: 36.0,
        location: 'Warehouse B - Shelf 03',
        status: 'ACTIVE',
      },
      {
        itemCode: 'PART-FLIGHT-CTRL',
        name: 'F7 Flight Controller with Dual Gyro',
        description: 'Main autopilot micro-controller board with dual IMUs',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 35,
        minStockLevel: 15,
        unitCost: 45.0,
        location: 'Warehouse B - Shelf 03',
        status: 'ACTIVE',
      },
      {
        itemCode: 'PART-LIPO-BATT',
        name: '6S 130C LiPo Battery 1800mAh',
        description: 'Rechargeable lithium polymer battery power pack',
        category: 'CONSUMABLE',
        unitOfMeasure: 'pcs',
        quantityOnHand: 85,
        minStockLevel: 25,
        unitCost: 32.0,
        location: 'HazMat Storage - Cabinet 1',
        status: 'ACTIVE',
      },
      {
        itemCode: 'RAW-BARE-PCB',
        name: 'Bare 4-Layer ESC High-TG PCB',
        description: 'Raw copper substrate circuit board panel for SMT line',
        category: 'RAW_MATERIAL',
        unitOfMeasure: 'pcs',
        quantityOnHand: 250,
        minStockLevel: 50,
        unitCost: 4.8,
        location: 'Warehouse A - Rack 05',
        status: 'ACTIVE',
      },
      {
        itemCode: 'RAW-MOSFET-PACK',
        name: 'Automotive MOSFET Power Stage 60V',
        description: 'High-current surface mount transistor reel for ESCs',
        category: 'RAW_MATERIAL',
        unitOfMeasure: 'pcs',
        quantityOnHand: 1500,
        minStockLevel: 400,
        unitCost: 1.25,
        location: 'Warehouse B - Reel Storage',
        status: 'ACTIVE',
      },
      {
        itemCode: 'ASY-DRONE-FRAME',
        name: 'Milled Carbon-Alloy Frame Core',
        description: 'Precision CNC-milled airframe subassembly',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 18,
        minStockLevel: 10,
        unitCost: 72.0,
        location: 'WIP Area - Station 3',
        status: 'ACTIVE',
      },
      {
        itemCode: 'ASY-DRONE-UNTESTED',
        name: 'Assembled Drone Airframe (Uncalibrated)',
        description: 'Full electro-mechanical assembly pending flight avionics calibration',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 12,
        minStockLevel: 5,
        unitCost: 295.0,
        location: 'WIP Area - Station 4',
        status: 'ACTIVE',
      },
      {
        itemCode: 'ASY-DRONE-CERTIFIED',
        name: 'Flight-Certified Autonomous Drone',
        description: 'Fully calibrated quadcopter with validated sensor suite and dynamic balance pass',
        category: 'SUB_ASSEMBLY',
        unitOfMeasure: 'pcs',
        quantityOnHand: 10,
        minStockLevel: 5,
        unitCost: 345.0,
        location: 'QC Clean Room - Bay 02',
        status: 'ACTIVE',
      },
      {
        itemCode: 'MAT-PACK-BOX',
        name: 'Mil-Spec Foam & Hard Transit Case',
        description: 'Weatherproof Pelican-style transport case with custom laser-cut EVA foam',
        category: 'CONSUMABLE',
        unitOfMeasure: 'pcs',
        quantityOnHand: 45,
        minStockLevel: 15,
        unitCost: 38.0,
        location: 'Packaging Supplies - Rack 01',
        status: 'ACTIVE',
      },
      {
        itemCode: 'PRD-AERO-DRONE-X4',
        name: 'AeroStrike X4 Autonomous Drone (Retail)',
        description: 'Industrial quadcopter UAV packaged with ground station, battery, and flight certificate',
        category: 'FINISHED_GOOD',
        unitOfMeasure: 'pcs',
        quantityOnHand: 8,
        minStockLevel: 5,
        unitCost: 385.0,
        location: 'Finished Goods Bay - Row 01',
        status: 'ACTIVE',
      },
      {
        itemCode: 'BYPRD-ALUM-SWARF',
        name: 'Recycled Aluminum Scrap / Swarf',
        description: 'Clean aluminum turnings & chips from CNC milling, sold for remelting',
        category: 'BY_PRODUCT',
        unitOfMeasure: 'kg',
        quantityOnHand: 85,
        minStockLevel: 0,
        unitCost: 1.5,
        location: 'Scrap Yard - Bin 03',
        status: 'ACTIVE',
      },
      {
        itemCode: 'BYPRD-SOLDER-DROSS',
        name: 'Recycled Solder Dross & Oxide Skimmings',
        description: 'High-purity tin-silver solder residue extracted from SMT reflow pot for reclamation',
        category: 'BY_PRODUCT',
        unitOfMeasure: 'kg',
        quantityOnHand: 14,
        minStockLevel: 0,
        unitCost: 6.2,
        location: 'Scrap Yard - Bin 05',
        status: 'ACTIVE',
      },
    ]);

    // Map itemCode to created item
    const itemMap = {};
    inventoryItems.forEach((item) => {
      itemMap[item.itemCode] = item;
    });

    // 2. Seed Work Centers
    const workCenters = await WorkCenter.insertMany([
      {
        code: 'WC-SMT-01',
        name: 'High-Speed SMT Placement Line',
        description: 'Yamaha surface-mount electronics assembly line for high-density PCBA boards',
        department: 'Electronics',
        type: 'MACHINE',
        capacityPerHour: 24,
        hourlyRate: 110.0,
        status: 'RUNNING',
        currentJob: 'WO-2026-0041 (4-in-1 ESC Batch)',
      },
      {
        code: 'WC-CNC-01',
        name: '5-Axis CNC Milling Center',
        description: 'High-precision Haas CNC milling machine for frame and motor mounts',
        department: 'Machining',
        type: 'MACHINE',
        capacityPerHour: 6,
        hourlyRate: 85.0,
        status: 'RUNNING',
        currentJob: 'WO-2026-0042 (Airframe Core)',
      },
      {
        code: 'WC-MAN-ASM-01',
        name: 'Main Assembly Workbench 1',
        description: 'Manual mechanical & electrical integration bench with ESD protection',
        department: 'Assembly',
        type: 'MANUAL_ASSEMBLY',
        capacityPerHour: 4,
        hourlyRate: 45.0,
        status: 'AVAILABLE',
        currentJob: 'WO-2026-0043 (Final Integration)',
      },
      {
        code: 'WC-TEST-QC-01',
        name: 'Avionics & Flight Test Cell',
        description: 'Anechoic sensor calibration, motor dyno testing, and QA inspection',
        department: 'Quality Assurance',
        type: 'QUALITY_CONTROL',
        capacityPerHour: 8,
        hourlyRate: 65.0,
        status: 'AVAILABLE',
        currentJob: '',
      },
      {
        code: 'WC-PKG-01',
        name: 'Final Packaging & Shipping Cell',
        description: 'Protective foam insertion, labeling, and boxing station',
        department: 'Logistics',
        type: 'PACKAGING',
        capacityPerHour: 18,
        hourlyRate: 35.0,
        status: 'AVAILABLE',
        currentJob: '',
      },
    ]);

    const wcMap = {};
    workCenters.forEach((wc) => {
      wcMap[wc.code] = wc;
    });

    // 3. Seed Bill of Materials (BOM) Pipeline
    // BOM 1: SMT Electronics Line -> Produces PART-ESC-4IN1 (feeds Main Assembly)
    const bomESC = await BOM.create({
      bomCode: 'BOM-SMT-ESC-01',
      name: '4-in-1 55A ESC Surface Mount PCBA',
      description: 'High-speed automated surface-mount assembly of 4-channel brushless electronic speed controller',
      version: '1.0',
      status: 'ACTIVE',
      primaryProduct: {
        item: itemMap['PART-ESC-4IN1']._id,
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
      secondaryOutputs: [
        {
          item: itemMap['BYPRD-SOLDER-DROSS']._id,
          type: 'BY_PRODUCT',
          quantity: 0.05,
          unitOfMeasure: 'kg',
          costAllocationPercent: 0,
          notes: 'Reclaimed tin/silver alloy dross skimmings',
        },
      ],
      components: [
        {
          item: itemMap['RAW-BARE-PCB']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 2,
          notes: 'High-TG 4-layer FR4 bare board',
        },
        {
          item: itemMap['RAW-MOSFET-PACK']._id,
          quantity: 8,
          unitOfMeasure: 'pcs',
          scrapFactor: 1,
          notes: 'Dual N-channel power FETs for 4-in-1 driver stages',
        },
      ],
      preferredWorkCenter: wcMap['WC-SMT-01']._id,
      notes: 'Inspect solder paste volume via 3D SPI before component placement',
    });

    // BOM 2: Frame Machining -> Produces ASY-DRONE-FRAME (feeds Main Assembly) + By-Product
    const bomFrame = await BOM.create({
      bomCode: 'BOM-FRAME-01',
      name: 'CNC Airframe Core Fabrication',
      description: 'Milling of lightweight carbon-aluminum core, producing recyclable aluminum swarf as by-product',
      version: '1.2',
      status: 'ACTIVE',
      primaryProduct: {
        item: itemMap['ASY-DRONE-FRAME']._id,
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
      secondaryOutputs: [
        {
          item: itemMap['BYPRD-ALUM-SWARF']._id,
          type: 'BY_PRODUCT',
          quantity: 2.2,
          unitOfMeasure: 'kg',
          costAllocationPercent: 0,
          notes: 'Aluminum chips and filings recovered by coolant chip conveyor',
        },
      ],
      components: [
        {
          item: itemMap['RAW-ALUM-6061']._id,
          quantity: 3.5,
          unitOfMeasure: 'kg',
          scrapFactor: 5,
          notes: 'Raw billet stock',
        },
        {
          item: itemMap['RAW-CF-SHEET']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 2,
          notes: 'Base sandwich plate',
        },
      ],
      preferredWorkCenter: wcMap['WC-CNC-01']._id,
      notes: 'Requires tool offset calibration prior to roughing cut',
    });

    // BOM 3: Main Drone Assembly -> Consumes Frame (from CNC) & ESC (from SMT), outputs ASY-DRONE-UNTESTED
    const bomDroneAsm = await BOM.create({
      bomCode: 'BOM-AERO-ASM-01',
      name: 'AeroStrike X4 Electro-Mechanical Integration',
      description: 'Full electro-mechanical assembly integrating chassis frame, SMT ESC board, motors, and wiring',
      version: '2.0',
      status: 'ACTIVE',
      primaryProduct: {
        item: itemMap['ASY-DRONE-UNTESTED']._id,
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
      secondaryOutputs: [],
      components: [
        {
          item: itemMap['ASY-DRONE-FRAME']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 0,
          notes: 'Milled chassis core from WC-CNC-01',
        },
        {
          item: itemMap['PART-ESC-4IN1']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 0,
          notes: 'High-power ESC from WC-SMT-01',
        },
        {
          item: itemMap['PART-BRUSHLESS-MTR']._id,
          quantity: 4,
          unitOfMeasure: 'pcs',
          scrapFactor: 1,
          notes: '2 CW motors, 2 CCW motors',
        },
        {
          item: itemMap['PART-FLIGHT-CTRL']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 0,
          notes: 'Flight controller stack',
        },
        {
          item: itemMap['PART-LIPO-BATT']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 0,
          notes: 'Power pack with quick-release harness',
        },
        {
          item: itemMap['RAW-COP-WIRE']._id,
          quantity: 3,
          unitOfMeasure: 'm',
          scrapFactor: 4,
          notes: 'Motor phase extension wiring',
        },
      ],
      preferredWorkCenter: wcMap['WC-MAN-ASM-01']._id,
      notes: 'Ensure torque driver calibration for motor screws (1.8 Nm)',
    });

    // BOM 4: Avionics & Flight Test Cell -> Consumes ASY-DRONE-UNTESTED, outputs ASY-DRONE-CERTIFIED
    const bomQC = await BOM.create({
      bomCode: 'BOM-AERO-QC-01',
      name: 'Avionics Calibration & Quality Certification',
      description: 'IMU accelerometer calibration, dynamic motor thrust balance, and firmware verification',
      version: '1.0',
      status: 'ACTIVE',
      primaryProduct: {
        item: itemMap['ASY-DRONE-CERTIFIED']._id,
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
      secondaryOutputs: [],
      components: [
        {
          item: itemMap['ASY-DRONE-UNTESTED']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 1,
          notes: 'Assembled drone from WC-MAN-ASM-01',
        },
      ],
      preferredWorkCenter: wcMap['WC-TEST-QC-01']._id,
      notes: 'Upload flight controller log to MES cloud repository before sign-off',
    });

    // BOM 5: Final Packaging & Shipping Cell -> Consumes ASY-DRONE-CERTIFIED + Packaging, outputs PRD-AERO-DRONE-X4
    const bomPkg = await BOM.create({
      bomCode: 'BOM-AERO-PKG-01',
      name: 'Drone Final Box Packaging & Serialization',
      description: 'Precision foam boxing, serial number etching, accessory kit pairing, and tamper-evident sealing',
      version: '1.0',
      status: 'ACTIVE',
      primaryProduct: {
        item: itemMap['PRD-AERO-DRONE-X4']._id,
        quantity: 1,
        unitOfMeasure: 'pcs',
      },
      secondaryOutputs: [],
      components: [
        {
          item: itemMap['ASY-DRONE-CERTIFIED']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 0,
          notes: 'Flight-certified drone airframe from WC-TEST-QC-01',
        },
        {
          item: itemMap['MAT-PACK-BOX']._id,
          quantity: 1,
          unitOfMeasure: 'pcs',
          scrapFactor: 1,
          notes: 'Laser-cut EVA foam & transit hardcase',
        },
      ],
      preferredWorkCenter: wcMap['WC-PKG-01']._id,
      notes: 'Affix barcode batch tracking label to outer carton',
    });

    res.json({
      success: true,
      message: 'Demo MES factory database seeded successfully with 5-stage production flow!',
      stats: {
        inventoryCount: inventoryItems.length,
        workCentersCount: workCenters.length,
        bomsCount: 5,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


