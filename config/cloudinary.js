const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'my_cloud_name', 
  api_key: 'my_key', 
  api_secret: 'my_secret'
});

module.exports = cloudinary;