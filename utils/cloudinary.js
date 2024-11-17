const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadAttachment = async (attachment) => {
  const result = await cloudinary.uploader.upload(attachment.url, {
    folder: 'deban_requests',
    resource_type: attachment.contentType.startsWith('image/') ? 'image' : 'video',
  });
  return result.secure_url;
};

module.exports = { uploadAttachment };
