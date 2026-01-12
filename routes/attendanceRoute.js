const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/check-in', authMiddleware, attendanceController.checkIn);
router.post('/check-out', authMiddleware, attendanceController.checkOut);
router.get('/status', authMiddleware, attendanceController.getStatus);

router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), attendanceController.getAll);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), attendanceController.deleteRecord);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), attendanceController.updateRecord);

module.exports = router;
