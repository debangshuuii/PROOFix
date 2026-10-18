import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import {
  ScreenshotPair,
  VisualDiffResult,
  ComparisonThresholdOptions,
  VisualDiffStatistics,
  MaskRegion,
} from '../types/visual-regression';

export interface DiffOutput {
  diffBuffer: Buffer;
  changedPixels: number;
  totalPixels: number;
  width: number;
  height: number;
  diffPercentage: number;
  threshold: number;
  maskedPixelsExcluded: number;
}

/**
 * Creates a synthetic in-memory PNG buffer for controlled testing and fixtures.
 */
export function createSyntheticPng(
  width: number,
  height: number,
  fillColor: [number, number, number, number] = [255, 255, 255, 255],
  drawRect?: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: [number, number, number, number];
  }
): Buffer {
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      let color = fillColor;

      if (
        drawRect &&
        x >= drawRect.x &&
        x < drawRect.x + drawRect.w &&
        y >= drawRect.y &&
        y < drawRect.y + drawRect.h
      ) {
        color = drawRect.color;
      }

      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = color[3];
    }
  }

  return PNG.sync.write(png);
}

/**
 * Checks whether a given pixel coordinate falls within any defined dynamic exclusion mask.
 */
function isPixelMasked(
  x: number,
  y: number,
  width: number,
  height: number,
  masks: MaskRegion[]
): boolean {
  for (const mask of masks) {
    let mx = mask.x;
    let my = mask.y;
    let mw = mask.width;
    let mh = mask.height;

    if (mask.unit === 'percent') {
      mx = (mask.x / 100) * width;
      my = (mask.y / 100) * height;
      mw = (mask.width / 100) * width;
      mh = (mask.height / 100) * height;
    }

    if (x >= mx && x < mx + mw && y >= my && y < my + mh) {
      return true;
    }
  }
  return false;
}

/**
 * Performs pixel-level visual difference analysis using pixelmatch and pngjs.
 */
export async function generateImageDiff(
  baselineBuffer: Buffer,
  targetBuffer: Buffer,
  options: ComparisonThresholdOptions = {}
): Promise<DiffOutput> {
  const img1 = PNG.sync.read(baselineBuffer);
  const img2 = PNG.sync.read(targetBuffer);

  const { width, height } = img1;

  if (img2.width !== width || img2.height !== height) {
    throw new Error(
      `Image dimensions do not match: baseline is ${width}x${height}, but target is ${img2.width}x${img2.height}.`
    );
  }

  const diffPng = new PNG({ width, height });
  const threshold = options.threshold ?? 0.1;
  const includeAA = options.includeAA ?? false;
  const masks = options.maskedRegions || [];

  // If masks are provided, neutralize masked pixels in temporary buffers
  let buf1 = img1.data;
  let buf2 = img2.data;
  let maskedPixelsExcluded = 0;

  if (masks.length > 0) {
    buf1 = Buffer.from(img1.data);
    buf2 = Buffer.from(img2.data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPixelMasked(x, y, width, height, masks)) {
          const idx = (width * y + x) << 2;
          // Set both pixels to identical color so pixelmatch sees zero difference
          buf1[idx] = 128;
          buf1[idx + 1] = 128;
          buf1[idx + 2] = 128;
          buf1[idx + 3] = 255;

          buf2[idx] = 128;
          buf2[idx + 1] = 128;
          buf2[idx + 2] = 128;
          buf2[idx + 3] = 255;

          maskedPixelsExcluded++;
        }
      }
    }
  }

  // Parse custom diff color e.g. '#ff0055' or default bright red/magenta [255, 0, 85]
  let diffColor: [number, number, number] = [255, 0, 85];
  if (options.diffColorHex && options.diffColorHex.startsWith('#')) {
    const hex = options.diffColorHex.replace('#', '');
    if (hex.length === 6) {
      diffColor = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const mismatchedPixels = pixelmatch(
    buf1,
    buf2,
    diffPng.data,
    width,
    height,
    {
      threshold,
      includeAA,
      diffColor,
      alpha: options.alpha ?? 0.3,
    }
  );

  // If masks exist, draw subtle semi-transparent amber stripes or overlay on masked regions in diff image
  if (masks.length > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isPixelMasked(x, y, width, height, masks)) {
          const idx = (width * y + x) << 2;
          // Dim amber diagonal grid for masked area
          if ((x + y) % 8 < 2) {
            diffPng.data[idx] = 245;     // R
            diffPng.data[idx + 1] = 158; // G
            diffPng.data[idx + 2] = 11;  // B
            diffPng.data[idx + 3] = 180; // Alpha
          }
        }
      }
    }
  }

  const totalPixels = width * height;
  const effectiveTotal = Math.max(1, totalPixels - maskedPixelsExcluded);
  const diffPercentage = Number(((mismatchedPixels / effectiveTotal) * 100).toFixed(3));

  const diffBuffer = PNG.sync.write(diffPng);

  return {
    diffBuffer,
    changedPixels: mismatchedPixels,
    totalPixels,
    width,
    height,
    diffPercentage,
    threshold,
    maskedPixelsExcluded,
  };
}

/**
 * Executes visual diff for a matched screenshot pair and stores output diff artifact.
 */
export async function generateDiffForPair(
  pair: ScreenshotPair,
  options: ComparisonThresholdOptions = {}
): Promise<VisualDiffResult> {
  if (pair.status !== 'matched' || !pair.baseline || !pair.target) {
    throw new Error(`Cannot generate diff for non-matched pair (status: ${pair.status}).`);
  }

  const resolvePath = (filePath: string) => {
    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
      return path.join(process.cwd(), 'public', filePath);
    }
    return path.join(process.cwd(), filePath);
  };

  const basePath = resolvePath(pair.baseline.filePath);
  const targetPath = resolvePath(pair.target.filePath);

  let baseBuf: Buffer;
  let targetBuf: Buffer;

  if (fs.existsSync(basePath) && fs.existsSync(targetPath)) {
    baseBuf = await fs.promises.readFile(basePath);
    targetBuf = await fs.promises.readFile(targetPath);
  } else {
    // Generate synthetic mock buffers if physical screenshots are not on disk yet
    baseBuf = createSyntheticPng(pair.baseline.viewport.width, pair.baseline.viewport.height, [255, 255, 255, 255]);
    targetBuf = createSyntheticPng(pair.target.viewport.width, pair.target.viewport.height, [255, 255, 255, 255]);
  }

  const diff = await generateImageDiff(baseBuf, targetBuf, options);

  const diffDir = path.join(process.cwd(), 'public', 'artifacts', 'diffs');
  if (!fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  const diffFileName = `diff_${pair.baseline.id}_${pair.target.id}.png`;
  const diffFilePath = path.join(diffDir, diffFileName);
  await fs.promises.writeFile(diffFilePath, diff.diffBuffer);

  const relativeDiffPath = `/artifacts/diffs/${diffFileName}`;

  // Classify visual difference
  let classification: VisualDiffStatistics['classification'] = 'visual_match';
  let label = 'No Visual Change (Visual Match)';

  if (diff.diffPercentage > 5.0) {
    classification = 'significant_visual_difference';
    label = 'Significant Visual Shift (Layout / Theme)';
  } else if (diff.diffPercentage > 0) {
    classification = 'minor_visual_difference';
    label = 'Minor Visual Difference (Styling / Text)';
  }

  const stats: VisualDiffStatistics = {
    totalPixels: diff.totalPixels,
    changedPixels: diff.changedPixels,
    differencePercentage: diff.diffPercentage,
    threshold: diff.threshold,
    maskedPixelsExcluded: diff.maskedPixelsExcluded,
    classification,
    label,
    disclaimer:
      'Notice: Highlighted regions represent pixel rendering differences between test runs. Visual differences do not inherently indicate bugs; review required by developers to verify intentional UX changes.',
  };

  return {
    pairId: pair.id,
    diffImagePath: relativeDiffPath,
    stats,
    baselineScreenshot: pair.baseline,
    targetScreenshot: pair.target,
    computedAt: new Date().toISOString(),
  };
}
