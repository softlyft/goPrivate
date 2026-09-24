/**
 * Extract the goPrivate mark from the official logo and write Expo icon/splash assets.
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'apps/mobile/assets/images/logo.jpg');
const outDir = path.join(root, 'apps/mobile/assets');

const WHITE = 248;
const SIZE = 1024;

async function extractContent(left, top, width, height) {
  const { data, info } = await sharp(src)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > WHITE && data[i + 1] > WHITE && data[i + 2] > WHITE) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: info }).png();
}

async function fitOnCanvas(image, { fill = 0.62, background = { r: 0, g: 0, b: 0, alpha: 0 } }) {
  const max = Math.round(SIZE * fill);
  const fitted = await image
    .resize(max, max, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png();
}

async function toMonochrome(image) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }
  return sharp(data, { raw: info }).png();
}

const mark = await extractContent(383, 236, 493, 429);
const brand = await extractContent(157, 236, 944, 690);

const icon = await fitOnCanvas(mark.clone(), {
  fill: 0.72,
  background: { r: 255, g: 255, b: 255, alpha: 1 },
});
const foreground = await fitOnCanvas(mark.clone(), { fill: 0.58 });
const monochrome = await fitOnCanvas(await toMonochrome(mark.clone()), { fill: 0.58 });
const splash = await fitOnCanvas(brand, {
  fill: 0.78,
  background: { r: 255, g: 255, b: 255, alpha: 1 },
});
const background = sharp({
  create: { width: SIZE, height: SIZE, channels: 3, background: '#FFFFFF' },
}).png();
const favicon = await mark.clone().resize(48, 48, { fit: 'inside' }).png();

await Promise.all([
  icon.toFile(path.join(outDir, 'icon.png')),
  foreground.toFile(path.join(outDir, 'android-icon-foreground.png')),
  monochrome.toFile(path.join(outDir, 'android-icon-monochrome.png')),
  background.toFile(path.join(outDir, 'android-icon-background.png')),
  splash.toFile(path.join(outDir, 'splash-icon.png')),
  favicon.toFile(path.join(outDir, 'favicon.png')),
]);

console.log('Wrote icon, adaptive foreground/background/monochrome, splash, and favicon');
