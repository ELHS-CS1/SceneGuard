/// <reference types="jest" />
/// <reference types="node" />

// Mock canvas and WebGL context for Babylon.js
interface MockWebGLRenderingContext {
  getExtension: () => null;
  getParameter: () => null;
  createBuffer: () => null;
  createFramebuffer: () => null;
  bindFramebuffer: () => null;
}

class MockCanvas {
  getContext(contextId: string, _options?: unknown): MockWebGLRenderingContext | null {
    if (contextId === 'webgl') {
      return {
        getExtension: () => null,
        getParameter: () => null,
        createBuffer: () => null,
        createFramebuffer: () => null,
        bindFramebuffer: () => null,
      };
    }
    return null;
  }
}

// Setup global mocks
Object.defineProperty(globalThis, 'HTMLCanvasElement', {
  value: MockCanvas,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'offscreenCanvasCtx', {
  value: {
    getContext: () => null,
  },
  writable: true,
  configurable: true,
});

// Mock window object
Object.defineProperty(globalThis, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
  configurable: true,
});
