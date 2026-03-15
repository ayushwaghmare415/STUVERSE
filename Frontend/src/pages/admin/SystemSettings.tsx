/**
 * ADMIN SETTINGS PAGE
 * ===================
 * 
 * PURPOSE: Admin can configure global platform settings
 * 
 * SETTINGS MANAGED:
 * 1. Platform Name - For branding/display
 * 2. Student Verification Required - Controls student onboarding flow
 * 3. Vendor Approval Required - Controls vendor offer workflow
 * 4. Max Claims Per Student - Prevents abuse/spam claiming
 * 5. Maintenance Mode - Temporarily disable platform access
 * 
 * FEATURES:
 * - Form with toggle switches and text inputs
 * - Real-time form state tracking
 * - Confirmation modal before saving
 * - Toast notifications for success/error
 * - Loading spinner during API calls
 * - Display of last update info (who/when)
 * - Modern SaaS UI with Tailwind CSS
 * - Responsive design for mobile/tablet
 * 
 * SECURITY:
 * - Frontend: ProtectedRoute ensures only admins access this page
 * - Backend: authenticateUser + authorizeRoles('admin') middleware
 * - All changes logged with admin ID and timestamp
 * - Input validation on frontend and backend
 * 
 * BUSINESS RULES:
 * - maintenanceMode: Affects all non-admin users immediately
 * - studentVerificationRequired: Changes affect new/pending students
 * - vendorApprovalRequired: Changes affect pending/new offers
 * - maxClaimsPerStudent: Must be 1-1000
 */

import { useEffect, useState } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ToggleRight,
  ToggleLeft,
  Lock,
  Users,
  Store,
  AlertTriangle,
  Info,
  Clock,
  User,
} from 'lucide-react';
import { getSettings, updateSettings } from '@/lib/adminApi';

// ============ TYPES ============

interface SettingsData {
  _id: string;
  platformName: string;
  studentVerificationRequired: boolean;
  vendorApprovalRequired: boolean;
  maxClaimsPerStudent: number;
  maintenanceMode: boolean;
  updatedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  updatedAt: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ConfirmModalState {
  isOpen: boolean;
  changedFields: string[];
}

// ============ COMPONENT ============

export default function SystemSettings() {
  // ============ STATE ============
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [formData, setFormData] = useState({
    platformName: '',
    studentVerificationRequired: false,
    vendorApprovalRequired: false,
    maxClaimsPerStudent: 10,
    maintenanceMode: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    changedFields: [],
  });

  // ============ UTILITY FUNCTIONS ============

  /**
   * Display toast notification
   */
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  /**
   * Format date to readable string
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get list of fields that have changed
   */
  const getChangedFields = (): string[] => {
    if (!settings) return [];

    const changed: string[] = [];

    if (formData.platformName !== settings.platformName) {
      changed.push('Platform Name');
    }
    if (
      formData.studentVerificationRequired !==
      settings.studentVerificationRequired
    ) {
      changed.push('Student Verification');
    }
    if (formData.vendorApprovalRequired !== settings.vendorApprovalRequired) {
      changed.push('Vendor Approval');
    }
    if (
      formData.maxClaimsPerStudent !== settings.maxClaimsPerStudent
    ) {
      changed.push('Max Claims Per Student');
    }
    if (formData.maintenanceMode !== settings.maintenanceMode) {
      changed.push('Maintenance Mode');
    }

    return changed;
  };

  /**
   * Check if form has unsaved changes
   */
  const hasChanges = getChangedFields().length > 0;

  // ============ API FUNCTIONS ============

  /**
   * Fetch current settings from backend
   */
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSettings();
      const data = response.data.data;

      setSettings(data);
      setFormData({
        platformName: data.platformName,
        studentVerificationRequired: data.studentVerificationRequired,
        vendorApprovalRequired: data.vendorApprovalRequired,
        maxClaimsPerStudent: data.maxClaimsPerStudent,
        maintenanceMode: data.maintenanceMode,
      });
    } catch (error: any) {
      console.error('[SETTINGS] Error fetching settings:', error);
      showToast(
        error.response?.data?.message || 'Failed to load settings',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save updated settings to backend
   */
  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Prepare update payload (only changed fields)
      const updatePayload: Record<string, any> = {};

      if (formData.platformName !== settings?.platformName) {
        updatePayload.platformName = formData.platformName;
      }
      if (
        formData.studentVerificationRequired !==
        settings?.studentVerificationRequired
      ) {
        updatePayload.studentVerificationRequired =
          formData.studentVerificationRequired;
      }
      if (
        formData.vendorApprovalRequired !== settings?.vendorApprovalRequired
      ) {
        updatePayload.vendorApprovalRequired =
          formData.vendorApprovalRequired;
      }
      if (
        formData.maxClaimsPerStudent !== settings?.maxClaimsPerStudent
      ) {
        updatePayload.maxClaimsPerStudent = formData.maxClaimsPerStudent;
      }
      if (formData.maintenanceMode !== settings?.maintenanceMode) {
        updatePayload.maintenanceMode = formData.maintenanceMode;
      }

      const response = await updateSettings(updatePayload);
      const updatedSettings = response.data.data;

      setSettings(updatedSettings);
      setFormData({
        platformName: updatedSettings.platformName,
        studentVerificationRequired:
          updatedSettings.studentVerificationRequired,
        vendorApprovalRequired: updatedSettings.vendorApprovalRequired,
        maxClaimsPerStudent: updatedSettings.maxClaimsPerStudent,
        maintenanceMode: updatedSettings.maintenanceMode,
      });

      setConfirmModal({ isOpen: false, changedFields: [] });

      // Show success toast with which fields were updated
      const changedFields = getChangedFields();
      showToast(
        `Settings saved successfully (${changedFields.length} field${changedFields.length !== 1 ? 's' : ''} updated)`,
        'success'
      );
    } catch (error: any) {
      console.error('[SETTINGS] Error saving settings:', error);
      showToast(
        error.response?.data?.message || 'Failed to save settings',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============ EVENT HANDLERS ============

  /**
   * Handle text input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: Math.max(1, Math.min(1000, parseInt(value) || 1)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  /**
   * Handle toggle switch changes
   */
  const handleToggleChange = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  /**
   * Handle save button click - show confirmation modal
   */
  const handleSaveClick = () => {
    const changedFields = getChangedFields();

    if (changedFields.length === 0) {
      showToast('No changes to save', 'info');
      return;
    }

    setConfirmModal({
      isOpen: true,
      changedFields,
    });
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = () => {
    if (settings) {
      setFormData({
        platformName: settings.platformName,
        studentVerificationRequired: settings.studentVerificationRequired,
        vendorApprovalRequired: settings.vendorApprovalRequired,
        maxClaimsPerStudent: settings.maxClaimsPerStudent,
        maintenanceMode: settings.maintenanceMode,
      });
      showToast('Changes discarded', 'info');
    }
  };

  // ============ LIFECYCLE ============

  useEffect(() => {
    fetchSettings();
  }, []);

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Platform Settings</h1>
          </div>
          <p className="text-slate-600">
            Configure global settings that control platform behavior for all users
          </p>
        </motion.div>

        {/* Main Settings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          {/* Maintenance Mode Warning */}
          {formData.maintenanceMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Maintenance Mode Enabled</p>
                <p className="text-sm text-red-800 mt-1">
                  Students and Vendors will be unable to access the platform. Only admins
                  retain full access.
                </p>
              </div>
            </motion.div>
          )}

          <div className="p-8">
            {/* Platform Name Section */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Platform Name
              </label>
              <p className="text-sm text-slate-600 mb-3">
                The name displayed to users across the platform
              </p>
              <input
                type="text"
                name="platformName"
                value={formData.platformName}
                onChange={handleInputChange}
                maxLength={100}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formData.platformName !== settings?.platformName
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300'
                }`}
                placeholder="Enter platform name"
              />
              <p className="text-xs text-slate-500 mt-2">
                {formData.platformName.length} / 100 characters
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 my-8" />

            {/* Toggle Switches Section */}
            <div className="space-y-6">
              {/* Student Verification Required */}
              <motion.div
                layout
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.studentVerificationRequired !==
                  settings?.studentVerificationRequired
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">
                        Student Verification Required
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      If enabled, students must be verified by admin before they can claim
                      offers. If disabled, students are auto-verified and can claim
                      immediately.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleChange('studentVerificationRequired')}
                    className="ml-4 shrink-0 focus:outline-none"
                  >
                    {formData.studentVerificationRequired ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="mt-3 pl-7 flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      formData.studentVerificationRequired
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {formData.studentVerificationRequired
                      ? '✓ Verification Required'
                      : '⚡ Auto-Verified'}
                  </div>
                </div>
              </motion.div>

              {/* Vendor Approval Required */}
              <motion.div
                layout
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.vendorApprovalRequired !==
                  settings?.vendorApprovalRequired
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">
                        Vendor Approval Required
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      If enabled, vendor offers must be approved by admin before going
                      live. If disabled, offers are auto-approved.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleChange('vendorApprovalRequired')}
                    className="ml-4 shrink-0 focus:outline-none"
                  >
                    {formData.vendorApprovalRequired ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="mt-3 pl-7 flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      formData.vendorApprovalRequired
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {formData.vendorApprovalRequired
                      ? '✓ Approval Required'
                      : '⚡ Auto-Approved'}
                  </div>
                </div>
              </motion.div>

              {/* Maintenance Mode */}
              <motion.div
                layout
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.maintenanceMode !== settings?.maintenanceMode
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">
                        Maintenance Mode
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600">
                      When enabled, students and vendors cannot access the platform. Only
                      admins retain full access.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleChange('maintenanceMode')}
                    className="ml-4 shrink-0 focus:outline-none"
                  >
                    {formData.maintenanceMode ? (
                      <ToggleRight className="w-8 h-8 text-red-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="mt-3 pl-7 flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      formData.maintenanceMode
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {formData.maintenanceMode ? '⚠️ Enabled' : '✓ Disabled'}
                  </div>
                </div>
              </motion.div>

              {/* Max Claims Per Student */}
              <motion.div
                layout
                className={`p-4 rounded-lg border-2 transition-colors ${
                  formData.maxClaimsPerStudent !==
                  settings?.maxClaimsPerStudent
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                <label className="block">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <h3 className="font-semibold text-slate-900">
                      Max Claims Per Student
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Prevents abuse by limiting the number of offers a student can claim
                    per day
                  </p>
                  <input
                    type="number"
                    name="maxClaimsPerStudent"
                    value={formData.maxClaimsPerStudent}
                    onChange={handleInputChange}
                    min={1}
                    max={1000}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Valid range: 1 - 1000. Current: {formData.maxClaimsPerStudent}
                  </p>
                </label>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 my-8" />

            {/* Last Updated Info */}
            {settings && (
              <div className="bg-slate-50 rounded-lg p-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Last Updated</span>
                </div>
                <p className="text-sm text-slate-700 mb-1">
                  {formatDate(settings.updatedAt)}
                </p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <p className="text-sm text-slate-600">
                    by <span className="font-medium">{settings.updatedBy.name}</span> (
                    {settings.updatedBy.email})
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleSaveClick}
                disabled={!hasChanges || saving}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  hasChanges && !saving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <LoaderCircle className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={!hasChanges || saving}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all border ${
                  hasChanges && !saving
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Cancel
              </button>
            </div>

            {/* Changed Fields Info */}
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3"
              >
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Unsaved Changes</p>
                  <p className="text-xs text-amber-800 mt-1">
                    {getChangedFields().join(', ')}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-dark max-w-sm w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Confirm Changes</h3>
              </div>

              <p className="text-slate-600 mb-4">
                You are about to update the following settings:
              </p>

              <ul className="bg-slate-50 rounded-lg p-3 mb-6 space-y-2">
                {confirmModal.changedFields.map((field) => (
                  <li key={field} className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    {field}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, changedFields: [] })}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`p-4 rounded-lg flex items-center gap-3 text-white shadow-lg max-w-sm ${
                toast.type === 'success'
                  ? 'bg-green-500'
                  : toast.type === 'error'
                  ? 'bg-red-500'
                  : toast.type === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
