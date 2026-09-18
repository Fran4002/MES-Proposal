const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');

router.get('/', bomController.getBOMs);
router.get('/:id', bomController.getBOMById);
router.post('/', bomController.createBOM);
router.put('/:id', bomController.updateBOM);
router.delete('/:id', bomController.deleteBOM);

module.exports = router;

