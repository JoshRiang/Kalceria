const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '../frontend/public/mapman.png');
const dest = path.join(__dirname, '../frontend/public/mapman.webp');

sharp(src)
  .webp({ quality: 85 })
  .toFile(dest)
  .then(() => {
    console.log('SUCCESS: Successfully converted mapman.png to mapman.webp');
  })
  .catch((err) => {
    console.error('ERROR:', err);
  });
