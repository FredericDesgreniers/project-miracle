export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return new Vec2(this.x / len, this.y / len);
  }
}

export class Mat4 {
  public data: Float32Array;

  constructor(data?: Float32Array) {
    this.data = data || new Float32Array(16);
  }

  static identity(): Mat4 {
    const m = new Mat4();
    m.data[0] = 1;
    m.data[5] = 1;
    m.data[10] = 1;
    m.data[15] = 1;
    return m;
  }

  static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const m = new Mat4();
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    m.data[0] = -2 * lr;
    m.data[5] = -2 * bt;
    m.data[10] = 2 * nf;
    m.data[12] = (left + right) * lr;
    m.data[13] = (top + bottom) * bt;
    m.data[14] = (far + near) * nf;
    m.data[15] = 1;

    return m;
  }

  static translate(x: number, y: number, z: number = 0): Mat4 {
    const m = Mat4.identity();
    m.data[12] = x;
    m.data[13] = y;
    m.data[14] = z;
    return m;
  }

  static scale(x: number, y: number, z: number = 1): Mat4 {
    const m = Mat4.identity();
    m.data[0] = x;
    m.data[5] = y;
    m.data[10] = z;
    return m;
  }

  static rotateZ(angle: number): Mat4 {
    const m = Mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.data[0] = c;
    m.data[1] = s;
    m.data[4] = -s;
    m.data[5] = c;
    return m;
  }

  multiply(other: Mat4): Mat4 {
    const result = new Mat4();
    const a = this.data;
    const b = other.data;
    const out = result.data;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }

    return result;
  }
}