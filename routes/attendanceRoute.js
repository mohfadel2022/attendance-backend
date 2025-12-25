const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/check-in', authMiddleware, attendanceController.checkIn);
router.post('/check-out', authMiddleware, attendanceController.checkOut);
router.get('/status', authMiddleware, attendanceController.getStatus);
router.get('/', authMiddleware, attendanceController.getAll);
router.delete('/:id', authMiddleware, attendanceController.deleteRecord);
router.put('/:id', authMiddleware, attendanceController.updateRecord);

module.exports = router;
