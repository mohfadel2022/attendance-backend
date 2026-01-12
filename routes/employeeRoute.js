const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), employeeController.createEmployee);
router.get('/', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), employeeController.getEmployees);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), employeeController.deleteEmployee);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'SUPERADMIN']), employeeController.updateEmployee);

module.exports = router;
