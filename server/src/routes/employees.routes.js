const express = require('express');
const employeesController = require('../controllers/employees.controller');
const verifyToken = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);

router.get('/', employeesController.getAllEmployees);
router.get('/:id/performance', employeesController.getEmployeePerformance);
router.get('/:id', employeesController.getEmployeeById);
router.put('/:id', employeesController.updateEmployee);
router.delete('/:id', employeesController.deleteEmployee);

module.exports = router;
