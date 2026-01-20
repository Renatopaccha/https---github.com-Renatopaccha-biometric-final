// Stub for Node.js 'fs' module (browser compatibility)
// xlsx-js-style may try to import this, but it's not needed in browser
// File system operations are replaced with browser APIs (Blob, download)

export const readFileSync = () => {
  console.warn('fs.readFileSync is not available in browser');
  return null;
};

export const writeFileSync = () => {
  console.warn('fs.writeFileSync is not available in browser - use XLSX.writeFile instead');
};

export const existsSync = () => false;
export const mkdirSync = () => {};
export const readdirSync = () => [];

export default {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync
};
