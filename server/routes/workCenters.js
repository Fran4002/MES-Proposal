const express = require('express');
const router = express.Router();
const workCenterController = require('../controllers/workCenterController');

router.get('/', workCenterController.getWorkCenters);
router.get('/:id', workCenterController.getWorkCenterById);
router.post('/', workCenterController.createWorkCenter);
router.put('/:id', workCenterController.updateWorkCenter);
router.delete('/:id', workCenterController.deleteWorkCenter);

module.exports = router;

