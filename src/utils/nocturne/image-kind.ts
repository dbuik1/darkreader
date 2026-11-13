export type Kind = 'light-graphic' | 'dark-icon' | 'photo' | 'skip';

const NEAR_WHITE = 0.85;
const TRANSPARENT_ALPHA = 0.1;

// Takes RGBA pixels of a downscaled image and decides how to filter it on a dark page.
export function classifyPixels(data: Uint8ClampedArray): Kind {
    const total = data.length / 4;
    if (total === 0) {
        return 'skip';
    }
    let transparent = 0;
    let white = 0;
    let lumSum = 0;
    const buckets = new Map<number, number>();
    let topBucket = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] / 255 < TRANSPARENT_ALPHA) {
            transparent++;
            continue;
        }
        const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        lumSum += lum;
        if (lum >= NEAR_WHITE) {
            white++;
        }
        // 4 bits per channel is coarse enough to merge JPEG noise in flat areas.
        const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
        const n = (buckets.get(key) ?? 0) + 1;
        buckets.set(key, n);
        topBucket = Math.max(topBucket, n);
    }
    const opaque = total - transparent;
    if (opaque === 0) {
        return 'skip';
    }
    const meanLum = lumSum / opaque;
    if (transparent / total > 0.25) {
        return meanLum < 0.35 ? 'dark-icon' : 'skip';
    }
    // Light graphics have a dominant flat background and a high share of near-white.
    if (white / opaque >= 0.45 && topBucket / opaque >= 0.3) {
        return 'light-graphic';
    }
    return 'photo';
}
