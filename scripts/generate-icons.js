// This script uses sharp to convert the improved SVG icon to all required PNG and favicon formats for PWA and browser use.
const sharp = require('sharp');
const fs = require('fs');

const src = 'public/icons/icon.svg';
const outputs = [
  { out: 'public/icons/icon-192x192.png', size: 192 },
  { out: 'public/icons/icon-512x512.png', size: 512 },
  { out: 'public/icons/icon-maskable-512x512.png', size: 512 },
  { out: 'public/favicon.ico', size: 32, ico: true },
];

(async () => {
  for (const { out, size, ico } of outputs) {
    if (ico) {
      await sharp(src)
        .resize(size, size)
        .toFormat('ico')
        .toFile(out);
    } else {
      await sharp(src)
        .resize(size, size)
        .png()
        .toFile(out);
    }
    console.log('Created', out);
  }
})();
