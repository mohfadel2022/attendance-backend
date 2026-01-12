const express = require('express');
const router = express.Router();
const officeController = require('../controllers/officeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, officeController.getOffice);
router.put('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), officeController.updateOffice);

module.exports = router;
