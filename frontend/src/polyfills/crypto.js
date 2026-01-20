// Stub for Node.js 'crypto' module (browser compatibility)
// Uses browser's Web Crypto API when available

export const randomBytes = (size) => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Fallback for older browsers
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

export const createHash = () => {
  console.warn('crypto.createHash is not fully supported in browser');
  return {
    update: () => this,
    digest: () => ''
  };
};

export default {
  randomBytes,
  createHash
};
