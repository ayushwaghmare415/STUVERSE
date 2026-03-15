const Settings = require('../models/Settings');

/**
 * STUVERSE ADMIN SETTINGS CONTROLLER
 * ===================================
 * 
 * Manages global platform configuration that affects:
 * 1. Student verification workflow
 * 2. Vendor approval workflow
 * 3. Platform maintenance mode
 * 4. Per-student claim limits
 * 
 * All endpoints require: authenticateUser + authorizeRoles('admin')
 * 
 * INITIALIZATION:
 * - Settings collection should have exactly ONE document
 * - On first access, create default settings if none exist
 */

// ------------------------------------------------------------------
// GET /admin/settings
// Fetch current platform settings
// ------------------------------------------------------------------

/**
 * GET /api/admin/settings
 * ========================
 * Fetch current global platform settings.
 * Creates default settings if none exist (initialization).
 * 
 * Response:
 * {
 *   _id: ObjectId,
 *   platformName: string,
 *   studentVerificationRequired: boolean,
 *   vendorApprovalRequired: boolean,
 *   maxClaimsPerStudent: number,
 *   maintenanceMode: boolean,
 *   updatedBy: User ID,
 *   updatedAt: ISO date string
 * }
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({}).populate(
      'updatedBy',
      'name email role'
    );

    // Initialize default settings if not exist
    if (!settings) {
      settings = await Settings.create({
        platformName: 'Stuverse',
        studentVerificationRequired: true,
        vendorApprovalRequired: true,
        maxClaimsPerStudent: 10,
        maintenanceMode: false,
        updatedBy: req.user._id,
      });
      console.log('[SETTINGS] Initialized default settings');
    }

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('[SETTINGS] Error fetching settings:', error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to fetch settings',
        error: error.message,
      });
  }
};

// ------------------------------------------------------------------
// PUT /admin/settings
// Update platform settings
// ------------------------------------------------------------------

/**
 * PUT /api/admin/settings
 * =======================
 * Update global platform settings.
 * Only admin can update. Validation prevents invalid values.
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
 * ValidationRules:
 * - platformName: non-empty string, max 100 chars
 * - maxClaimsPerStudent: integer between 1-1000
 * - all boolean fields: must be true/false
 * 
 * Response: Updated settings document
 * 
 * BUSINESS IMPACT:
 * If maintenanceMode changes to true:
 * - Broadcast notification to all users
 * - Recommend: Restart frontend services
 * 
 * If studentVerificationRequired changes to false:
 * - All pending students become eligible to claim
 * - Recommend: Notify students of new access
 * 
 * If vendorApprovalRequired changes to false:
 * - All pending offers auto-approve
 * - Recommend: Notify vendors of approved offers
 */
exports.updateSettings = async (req, res) => {
  try {
    const {
      platformName,
      studentVerificationRequired,
      vendorApprovalRequired,
      maxClaimsPerStudent,
      maintenanceMode,
    } = req.body;

    // ============ VALIDATION ============

    // Validate platformName
    if (platformName !== undefined) {
      if (typeof platformName !== 'string' || platformName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'platformName must be a non-empty string',
        });
      }
      if (platformName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'platformName must be less than 100 characters',
        });
      }
    }

    // Validate maxClaimsPerStudent
    if (maxClaimsPerStudent !== undefined) {
      const num = Number(maxClaimsPerStudent);
      if (!Number.isInteger(num) || num < 1 || num > 1000) {
        return res.status(400).json({
          success: false,
          message: 'maxClaimsPerStudent must be an integer between 1 and 1000',
        });
      }
    }

    // Validate boolean fields
    if (studentVerificationRequired !== undefined) {
      if (typeof studentVerificationRequired !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'studentVerificationRequired must be a boolean',
        });
      }
    }

    if (vendorApprovalRequired !== undefined) {
      if (typeof vendorApprovalRequired !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'vendorApprovalRequired must be a boolean',
        });
      }
    }

    if (maintenanceMode !== undefined) {
      if (typeof maintenanceMode !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'maintenanceMode must be a boolean',
        });
      }
    }

    // ============ UPDATE ============

    // Find existing settings (should only have one document)
    let settings = await Settings.findOne({});

    if (!settings) {
      // Create if doesn't exist
      settings = await Settings.create({
        platformName: platformName || 'Stuverse',
        studentVerificationRequired:
          studentVerificationRequired !== undefined
            ? studentVerificationRequired
            : true,
        vendorApprovalRequired:
          vendorApprovalRequired !== undefined ? vendorApprovalRequired : true,
        maxClaimsPerStudent: maxClaimsPerStudent || 10,
        maintenanceMode: maintenanceMode || false,
        updatedBy: req.user._id,
      });

      console.log('[SETTINGS] Created new settings document');

      // Populate before returning
      await settings.populate('updatedBy', 'name email role');

      return res.json({
        success: true,
        message: 'Settings created successfully',
        data: settings,
      });
    }

    // Update existing settings
    if (platformName !== undefined) settings.platformName = platformName;
    if (studentVerificationRequired !== undefined)
      settings.studentVerificationRequired = studentVerificationRequired;
    if (vendorApprovalRequired !== undefined)
      settings.vendorApprovalRequired = vendorApprovalRequired;
    if (maxClaimsPerStudent !== undefined)
      settings.maxClaimsPerStudent = maxClaimsPerStudent;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;

    // Update audit trail
    settings.updatedBy = req.user._id;
    settings.updatedAt = new Date();

    await settings.save();

    // Populate updated settings
    await settings.populate('updatedBy', 'name email role');

    console.log(`[SETTINGS] Updated by admin ${req.user._id}`);

    return res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    console.error('[SETTINGS] Error updating settings:', error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: 'Failed to update settings',
        error: error.message,
      });
  }
};
