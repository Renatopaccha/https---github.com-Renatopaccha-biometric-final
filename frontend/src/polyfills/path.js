// Stub for Node.js 'path' module (browser compatibility)

export const join = (...args) => args.join('/');
export const resolve = (...args) => args.join('/');
export const dirname = (path) => path.split('/').slice(0, -1).join('/');
export const basename = (path) => path.split('/').pop();
export const extname = (path) => {
  const base = basename(path);
  const dotIndex = base.lastIndexOf('.');
  return dotIndex > 0 ? base.slice(dotIndex) : '';
};

export const sep = '/';
export const delimiter = ':';

export default {
  join,
  resolve,
  dirname,
  basename,
  extname,
  sep,
  delimiter
};
