import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, 'public', 'logo.png');
const outDir = join(__dirname, 'public', 'icons');

mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
    await sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
        .png()
        .toFile(join(outDir, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png`);
}
console.log('All icons generated!');
