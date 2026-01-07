import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

const sizes = [192, 512];

async function generateIcons() {
  const svgPath = join(publicDir, 'icon.svg');
  const svgContent = readFileSync(svgPath, 'utf-8');

  for (const size of sizes) {
    // Update SVG viewBox for the target size
    const resizedSvg = svgContent
      .replace(/width="512"/, `width="${size}"`)
      .replace(/height="512"/, `height="${size}"`);

    const outputPath = join(publicDir, `icon-${size}.png`);

    await sharp(Buffer.from(resizedSvg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}.png`);
  }

  // Generate maskable icon (with extra padding for safe zone)
  const maskableSize = 512;
  const maskableSvg = `<svg width="${maskableSize}" height="${maskableSize}" viewBox="0 0 ${maskableSize} ${maskableSize}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${maskableSize}" height="${maskableSize}" fill="#1C1C1E"/>
  <text x="${maskableSize/2}" y="${maskableSize * 0.62}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${maskableSize * 0.45}" font-weight="700" fill="#007AFF">W</text>
</svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-maskable-512.png'));

  console.log('Generated: icon-maskable-512.png');
  console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
