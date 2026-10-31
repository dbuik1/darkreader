import {classifyPixels} from '../../../src/inject/nocturne/image-kind';

type RGBA = [number, number, number, number];

function pixels(count: number, pick: (i: number) => RGBA): Uint8ClampedArray {
    const data = new Uint8ClampedArray(count * 4);
    for (let i = 0; i < count; i++) {
        data.set(pick(i), i * 4);
    }
    return data;
}

const WHITE: RGBA = [255, 255, 255, 255];
const BLUE: RGBA = [37, 99, 235, 255];
const INK: RGBA = [17, 24, 39, 255];
const CLEAR: RGBA = [0, 0, 0, 0];

test('White screenshot with a few coloured parts is a light graphic', () => {
    expect(classifyPixels(pixels(1600, (i) => (i % 10 === 0 ? BLUE : i % 7 === 0 ? INK : WHITE)))).toBe('light-graphic');
});

test('Dark icon on a transparent background is a dark icon', () => {
    expect(classifyPixels(pixels(1600, (i) => (i % 3 === 0 ? INK : CLEAR)))).toBe('dark-icon');
});

test('Colourful logo on a transparent background is left alone', () => {
    expect(classifyPixels(pixels(1600, (i) => (i % 3 === 0 ? [250, 200, 40, 255] : CLEAR)))).toBe('skip');
});

test('Continuous-tone image is a photo', () => {
    const photo = pixels(1600, (i) => {
        const x = i % 40;
        const y = Math.floor(i / 40);
        return [60 + x * 4, 90 + y * 3, 140 + ((x * y) % 90), 255];
    });
    expect(classifyPixels(photo)).toBe('photo');
});

test('Bright photo with a pale sky is still a photo', () => {
    const photo = pixels(1600, (i) => {
        const x = i % 40;
        const y = Math.floor(i / 40);
        return y < 24 ? [200 + (x % 12), 215 + (y % 9), 240, 255] : [40 + x, 110 + (y % 30), 30, 255];
    });
    expect(classifyPixels(photo)).toBe('photo');
});

test('Fully transparent image is skipped', () => {
    expect(classifyPixels(pixels(100, () => CLEAR))).toBe('skip');
});
