
import { Jimp } from 'jimp';
import { promises as fs } from 'fs';

async function processIcon() {
    try {
        console.log('Reading icon-foreground.png...');
        const image = await Jimp.read('assets/icon-foreground.png');

        console.log('Autocropping...');
        // Crop the image to the actual content
        image.autocrop();

        // Get the dimensions after crop
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        console.log(`New dimensions: ${width}x${height}`);

        // Sample the color from the top center edge to determine background color
        const edgeColor = image.getPixelColor(Math.floor(width / 2), 0);
        const hex = '#' + edgeColor.toString(16).slice(0, 6).padStart(6, '0'); // remove alpha

        console.log(`Detected edge color: ${hex}`);

        console.log('Saving cropped foreground...');
        await image.write('assets/icon-foreground.png');

        console.log('Generating matching background...');
        const bgImage = codes => new Jimp({ width: 1024, height: 1024, color: parseInt(hex.replace('#', '') + 'FF', 16) });
        // Jimp constructor usage might vary, let's just use create a new image
        const background = new Jimp({ width: 1024, height: 1024, color: parseInt(hex.replace('#', '') + 'FF', 16) });

        await background.write('assets/icon-background.png');

        console.log('Done!');
    } catch (error) {
        console.error('Error processing icon:', error);
    }
}

processIcon();
