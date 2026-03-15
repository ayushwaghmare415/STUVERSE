const express = require('express');
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const { getClaimHistory } = require('../controllers/studentController');

const router = express.Router();

/**
 * GET /api/redemptions/student/:studentId
 * Fetch redemption history for a student (self or admin).
 */
router.get('/student/:studentId', authenticateUser, authorizeRoles('student', 'admin'), getClaimHistory);

module.exports = router;
