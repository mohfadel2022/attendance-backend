const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.put('/settings', authMiddleware, authController.updateSettings);
router.put('/password', authMiddleware, authController.changePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authController.logout);

module.exports = router;
