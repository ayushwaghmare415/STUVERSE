const multer = require('multer');

// memory storage allows us to access the file buffer and then upload to cloudinary without
// leaving temporary files on disk.
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;