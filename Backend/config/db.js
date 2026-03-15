// MongoDB connection helper
const mongoose = require('mongoose');

// Export an async function that establishes a connection using
// either MONGO_URI or MONGODB_URI so the variable name is flexible.
module.exports = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MongoDB URI defined in environment');
    process.exit(1);
  }

  try {
    // mongoose options are optional depending on version
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};
