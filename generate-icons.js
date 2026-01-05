
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Jimp } = require('jimp');
import path from 'path';

async function generateIcons() {
    const logoPath = 'public/logo.png';
    const publicDir = 'public';

    try {
        const image = await Jimp.read(logoPath);

        await image.clone().resize(192, 192).writeAsync(path.join(publicDir, 'pwa-192x192.png'));
        console.log('Generated pwa-192x192.png');

        await image.clone().resize(512, 512).writeAsync(path.join(publicDir, 'pwa-512x512.png'));
        console.log('Generated pwa-512x512.png');

        await image.clone().resize(180, 180).writeAsync(path.join(publicDir, 'apple-touch-icon.png'));
        console.log('Generated apple-touch-icon.png');

        // Mask icon (usually SVG or monochrome PNG, we'll just use the logo for now if SVG not available)
        // For now, let's just stick to the main ones.

    } catch (err) {
        console.error('Error generating icons:', err);
    }
}

generateIcons();
