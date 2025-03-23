// jest.setup.ts
import '@testing-library/jest-dom';

// Mock WebGL context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  // Add basic WebGL mock properties
  canvas: {},
  drawingBufferWidth: 0,
  drawingBufferHeight: 0,
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 0);
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (handle: number): void => {
  clearTimeout(handle);
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}; 