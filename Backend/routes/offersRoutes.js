const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles } = require('../middleware/authorization');
const studentController = require('../controllers/studentController');

// GET /api/offers - Fetch approved offers with filters
router.get('/', authenticateUser, authorizeRoles('student'), studentController.listOffers);

// GET /api/offers/approved - Alias for approved offers (required by student dashboard)
router.get('/approved', authenticateUser, authorizeRoles('student'), studentController.listOffers);

// GET /api/offers/browse - Browse offers for students (same as above)
router.get('/browse', authenticateUser, authorizeRoles('student'), studentController.listOffers);

// POST /api/offers/claim - Student claims an offer by couponId
router.post('/claim', authenticateUser, authorizeRoles('student'), (req, res, next) => {
  req.params.id = req.body.couponId || req.body.id;
  if (!req.params.id) {
    return res.status(400).json({ message: 'couponId is required' });
  }
  return studentController.claimOffer(req, res, next);
});

// GET /api/offers/nearby - Fetch offers near the student's current location
router.get('/nearby', authenticateUser, authorizeRoles('student'), studentController.getNearbyOffers);

module.exports = router;