const express = require('express');
const router = express.Router();
const seedController = require('../controllers/seedController');

router.post('/', seedController.seedData);

module.exports = router;

