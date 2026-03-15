const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const settingsCtrl = require('../controllers/settingsController');

/**
 * ADMIN SETTINGS ROUTES
 * ====================
 * All routes require:
 * 1. Valid JWT token (Bearer token in Authorization header)
 * 2. Admin role (authorizeRoles('admin'))
 * 3. Account not blocked (enforced by authenticateUser middleware)
 * 
 * These routes manage global platform configuration:
 * - Student verification requirements
 * - Vendor approval workflows
 * - Platform maintenance mode
 * - Per-student claim limits
 */

/**
 * GET /admin/settings
 * ===================
 * Fetch current global platform settings.
 * Creates default settings on first access.
 * 
 * Response: Settings document with all configuration values
 */
router.get(
  '/',
  authenticateUser,
  authorizeRoles('admin'),
  settingsCtrl.getSettings
);

/**
 * PUT /admin/settings
 * ===================
 * Update global platform settings.
 * 
 * Request Body (all fields optional):
 * {
 *   platformName?: string (1-100 chars),
 *   studentVerificationRequired?: boolean,
 *   vendorApprovalRequired?: boolean,
 *   maxClaimsPerStudent?: number (1-1000),
 *   maintenanceMode?: boolean
 * }
 * 
 * Validation:
 * - platformName: non-empty, max 100 chars
 * - maxClaimsPerStudent: integer 1-1000
 * - All boolean fields must be true/false
 * 
 * Response: Updated Settings document
 * 
 * IMPORTANT WORKFLOW EFFECTS:
 * When maintenanceMode = true:
 * - Students/Vendors receive 503 Unavailable
 * - Only admins can access dashboard
 * 
 * When studentVerificationRequired = false:
 * - All pending students can claim offers
 * - New students auto-verified
 * 
 * When vendorApprovalRequired = false:
 * - All pending offers auto-approved
 * - New offers skip approval workflow
 */
router.put(
  '/',
  authenticateUser,
  authorizeRoles('admin'),
  settingsCtrl.updateSettings
);

module.exports = router;
