const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.getConfig);
router.put('/', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.updateConfig);
router.post('/check-remote', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.checkRemoteStatus);
router.post('/check-local', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.checkLocalStatus);
router.get('/explore-local', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.exploreLocalFiles);
router.post('/sync', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.syncDatabases);
router.post('/pull-remote', authMiddleware, roleMiddleware(['SUPERADMIN']), configController.pullFromRemote);

module.exports = router;
