const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function removeWhiteBackground() {
  try {
    const inputPath = path.join(__dirname, 'public', 'brgy-logo.png');
    const outputPath = path.join(__dirname, 'public', 'brgy-logo-transparent.png');
    const backupPath = path.join(__dirname, 'public', 'brgy-logo-backup.png');

    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error('❌ Logo file not found at:', inputPath);
      return;
    }

    // Create backup of original
    console.log('📦 Creating backup of original logo...');
    fs.copyFileSync(inputPath, backupPath);
    console.log('✅ Backup created:', backupPath);

    // Process image - remove white background
    console.log('🎨 Processing image to remove white background...');
    
    await sharp(inputPath)
      .flatten({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .removeAlpha()
      .toBuffer()
      .then(data => sharp(data)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      )
      .then(({ data, info }) => {
        // Create a new buffer with transparency
        const { width, height, channels } = info;
        const newData = Buffer.from(data);
        
        // Convert white pixels to transparent
        for (let i = 0; i < data.length; i += channels) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is white or near-white (adjust threshold as needed)
          if (r > 240 && g > 240 && b > 240) {
            newData[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
        
        return sharp(newData, {
          raw: {
            width,
            height,
            channels
          }
        }).png().toFile(outputPath);
      });

    console.log('✅ Transparent logo created:', outputPath);
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Check the new transparent logo: brgy-logo-transparent.png');
    console.log('2. If it looks good, replace the original:');
    console.log('   - Delete or rename brgy-logo.png');
    console.log('   - Rename brgy-logo-transparent.png to brgy-logo.png');
    console.log('3. Your original is backed up as: brgy-logo-backup.png');
    
  } catch (error) {
    console.error('❌ Error processing image:', error.message);
    console.error('');
    console.error('💡 Make sure sharp is installed:');
    console.error('   npm install sharp');
  }
}

// Run the function
removeWhiteBackground();
