const { inflateSync } = require("node:zlib");

const PNG_SIGNATURE_BYTES = 8;
const CHANNEL_TOLERANCE = 8;
// A small tolerance absorbs cross-frame antialiasing noise while still rejecting visible redesigns.
const MAX_DIFFERENT_PIXEL_RATIO = 0.01;

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function readChunks(png) {
  const chunks = [];
  let offset = PNG_SIGNATURE_BYTES;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    chunks.push({ type, data: png.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
  }
  return chunks;
}

function channelsForColorType(colorType) {
  if (colorType === 2) {
    return 3;
  }
  if (colorType === 6) {
    return 4;
  }
  throw new Error(`Unsupported Chrome screenshot PNG color type: ${colorType}`);
}

function unfilterRow(filter, current, previous, bytesPerPixel) {
  for (let index = 0; index < current.length; index += 1) {
    const left = index >= bytesPerPixel ? current[index - bytesPerPixel] : 0;
    const above = previous ? previous[index] : 0;
    const upperLeft = previous && index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    if (filter === 1) {
      current[index] = (current[index] + left) & 0xff;
    } else if (filter === 2) {
      current[index] = (current[index] + above) & 0xff;
    } else if (filter === 3) {
      current[index] = (current[index] + Math.floor((left + above) / 2)) & 0xff;
    } else if (filter === 4) {
      current[index] = (current[index] + paethPredictor(left, above, upperLeft)) & 0xff;
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG filter: ${filter}`);
    }
  }
}

function decodeChromeScreenshot(base64) {
  const png = Buffer.from(base64, "base64");
  const chunks = readChunks(png);
  const header = chunks.find((chunk) => chunk.type === "IHDR");
  if (!header) {
    throw new Error("Screenshot PNG is missing its IHDR chunk.");
  }

  const width = header.data.readUInt32BE(0);
  const height = header.data.readUInt32BE(4);
  const bitDepth = header.data[8];
  const colorType = header.data[9];
  const interlace = header.data[12];
  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error("Chrome screenshot PNG must use 8-bit non-interlaced pixels.");
  }

  const channels = channelsForColorType(colorType);
  const rowLength = width * channels;
  const compressed = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const filtered = inflateSync(compressed);
  const pixels = Buffer.alloc(rowLength * height);
  let sourceOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    const current = Buffer.from(filtered.subarray(sourceOffset, sourceOffset + rowLength));
    sourceOffset += rowLength;
    const previous = row > 0 ? pixels.subarray((row - 1) * rowLength, row * rowLength) : null;
    unfilterRow(filter, current, previous, channels);
    current.copy(pixels, row * rowLength);
  }

  return { channels, colorType, height, pixels, width };
}

function compareScreenshots(actualBase64, expectedBase64) {
  const actual = decodeChromeScreenshot(actualBase64);
  const expected = decodeChromeScreenshot(expectedBase64);
  if (actual.width !== expected.width || actual.height !== expected.height || actual.colorType !== expected.colorType) {
    return { matches: false, reason: "Screenshot dimensions or color formats differ." };
  }

  let differentPixels = 0;
  for (let offset = 0; offset < actual.pixels.length; offset += actual.channels) {
    let pixelDiffers = false;
    for (let channel = 0; channel < actual.channels; channel += 1) {
      if (Math.abs(actual.pixels[offset + channel] - expected.pixels[offset + channel]) > CHANNEL_TOLERANCE) {
        pixelDiffers = true;
        break;
      }
    }
    if (pixelDiffers) {
      differentPixels += 1;
    }
  }

  const totalPixels = actual.width * actual.height;
  const differentPixelRatio = differentPixels / totalPixels;
  return {
    differentPixelRatio,
    differentPixels,
    matches: differentPixelRatio <= MAX_DIFFERENT_PIXEL_RATIO,
    totalPixels
  };
}

module.exports = {
  compareScreenshots
};
