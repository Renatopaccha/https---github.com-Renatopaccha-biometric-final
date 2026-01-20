// Stub for Node.js 'stream' module (browser compatibility)
// xlsx-js-style may try to import this, but it's not needed in browser

export class Readable {
  constructor() {}
  pipe() { return this; }
  on() { return this; }
}

export class Writable {
  constructor() {}
  write() {}
  end() {}
}

export class Transform extends Readable {
  constructor() {
    super();
  }
}

export default {
  Readable,
  Writable,
  Transform
};
