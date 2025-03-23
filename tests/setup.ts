/// <reference types="node" />

// Mock canvas and WebGL context for Babylon.js
interface WebGLContext {
    getExtension: () => null;
    getParameter: () => null;
    createBuffer: () => null;
    createFramebuffer: () => null;
    bindFramebuffer: () => null;
}

class MockCanvas implements Partial<HTMLCanvasElement> {
    getContext(): WebGLContext {
        return {
            getExtension: () => null,
            getParameter: () => null,
            createBuffer: () => null,
            createFramebuffer: () => null,
            bindFramebuffer: () => null,
        };
    }
}

type CustomGlobal = {
    HTMLCanvasElement: typeof MockCanvas;
    offscreenCanvasCtx: {
        getContext: () => null;
    };
    window: {
        addEventListener: jest.Mock;
        removeEventListener: jest.Mock;
    };
}

// Extend NodeJS.Global
declare global {
    namespace NodeJS {
        interface Global extends CustomGlobal {}
    }
}

// Setup global mocks
Object.defineProperty(global, 'HTMLCanvasElement', {
    value: MockCanvas,
    writable: true
});

Object.defineProperty(global, 'offscreenCanvasCtx', {
    value: {
        getContext: () => null,
    },
    writable: true
});

// Mock window object
Object.defineProperty(global, 'window', {
    value: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    },
    writable: true
});
