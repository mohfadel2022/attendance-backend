const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
// Middleware to check auth would be here. Skipping for speed/simplicity initially.

router.post('/', employeeController.createEmployee);
router.get('/', employeeController.getEmployees);
router.delete('/:id', employeeController.deleteEmployee);
router.put('/:id', employeeController.updateEmployee);

module.exports = router;
