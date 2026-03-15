// Cloudinary config
const cloudinary = require('cloudinary').v2;
const {
  CLOUDINARY_URL,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (CLOUDINARY_URL && CLOUDINARY_URL.trim()) {
  cloudinary.config({ cloudinary_url: CLOUDINARY_URL.trim() });
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME && CLOUDINARY_CLOUD_NAME.trim(),
    api_key: CLOUDINARY_API_KEY && CLOUDINARY_API_KEY.trim(),
    api_secret: CLOUDINARY_API_SECRET && CLOUDINARY_API_SECRET.trim(),
  });
}

module.exports = cloudinary;
