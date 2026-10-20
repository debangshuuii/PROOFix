import fs from 'fs';
import path from 'path';
import type { BoundingBox } from '../types/semantic-vision.ts';

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  byteSize: number;
  format: 'png' | 'jpeg' | 'webp' | 'unknown';
}

export interface PreparedVisionImage {
  base64Data: string;
  mimeType: string;
  dataUrl: string;
  metadata: ImageMetadata;
}

/**
 * Extracts basic image metadata directly from file buffer headers.
 */
export function extractPngDimensions(buffer: Buffer): { width: number; height: number } {
  // Check PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    // IHDR chunk starts at byte 12. Width is at 16..20, Height at 20..24 (big-endian 32-bit int)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  return { width: 0, height: 0 };
}

/**
 * Prepares an image for multimodal vision model inference.
 */
export function prepareVisionImage(imageInput: string | Buffer): PreparedVisionImage {
  let buffer: Buffer;
  let mimeType = 'image/png';
  let format: ImageMetadata['format'] = 'png';

  if (typeof imageInput === 'string') {
    if (imageInput.startsWith('data:')) {
      const match = imageInput.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid base64 data URL format');
      }
      mimeType = match[1];
      format = mimeType.includes('jpeg') ? 'jpeg' : mimeType.includes('webp') ? 'webp' : 'png';
      buffer = Buffer.from(match[2], 'base64');
    } else {
      // Local file path
      const resolved = path.resolve(imageInput);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Image file not found at: ${resolved}`);
      }
      buffer = fs.readFileSync(resolved);
      const ext = path.extname(resolved).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
        format = 'jpeg';
      } else if (ext === '.webp') {
        mimeType = 'image/webp';
        format = 'webp';
      }
    }
  } else {
    buffer = imageInput;
  }

  const { width, height } = extractPngDimensions(buffer);
  const effectiveWidth = width || 1280;
  const effectiveHeight = height || 800;

  const base64Data = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  return {
    base64Data,
    mimeType,
    dataUrl,
    metadata: {
      width: effectiveWidth,
      height: effectiveHeight,
      aspectRatio: Number((effectiveWidth / effectiveHeight).toFixed(3)),
      byteSize: buffer.length,
      format,
    },
  };
}

/**
 * Normalizes, clamps, and translates bounding box coordinates relative to screen dimensions.
 */
export function normalizeBoundingBox(
  box: BoundingBox,
  imageDimensions: { width: number; height: number },
  targetUnit: 'px' | 'percent' = 'px'
): BoundingBox {
  const imgW = Math.max(1, imageDimensions.width);
  const imgH = Math.max(1, imageDimensions.height);

  let xPx = box.x;
  let yPx = box.y;
  let widthPx = box.width;
  let heightPx = box.height;

  if (box.unit === 'percent') {
    xPx = (box.x / 100) * imgW;
    yPx = (box.y / 100) * imgH;
    widthPx = (box.width / 100) * imgW;
    heightPx = (box.height / 100) * imgH;
  }

  // Clamp within bounds
  const clampedX = Math.max(0, Math.min(imgW, Math.round(xPx)));
  const clampedY = Math.max(0, Math.min(imgH, Math.round(yPx)));
  const clampedWidth = Math.max(1, Math.min(imgW - clampedX, Math.round(widthPx)));
  const clampedHeight = Math.max(1, Math.min(imgH - clampedY, Math.round(heightPx)));

  if (targetUnit === 'percent') {
    return {
      x: Number(((clampedX / imgW) * 100).toFixed(2)),
      y: Number(((clampedY / imgH) * 100).toFixed(2)),
      width: Number(((clampedWidth / imgW) * 100).toFixed(2)),
      height: Number(((clampedHeight / imgH) * 100).toFixed(2)),
      unit: 'percent',
    };
  }

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
    unit: 'px',
  };
}
