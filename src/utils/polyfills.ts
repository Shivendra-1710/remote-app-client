import { Buffer } from 'buffer';

// Polyfill global for simple-peer
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Required for simple-peer
if (!window.process) {
  (window as any).process = { env: {} };
}

// Required for Buffer
if (!window.Buffer) {
  (window as any).Buffer = Buffer;
}

export {}; 