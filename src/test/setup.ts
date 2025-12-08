import '@testing-library/jest-dom'

// jsdom doesn't provide ImageData, so we polyfill it
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: 'srgb' = 'srgb';

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      heightOrSettings?: number | ImageDataSettings
    ) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = typeof heightOrSettings === 'number' ? heightOrSettings : dataOrWidth.length / (widthOrHeight * 4);
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  }

  globalThis.ImageData = ImageDataPolyfill as unknown as typeof ImageData;
}
