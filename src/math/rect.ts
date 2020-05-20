import { SimpleTransform } from './transform';
import { V, Vector2 } from './vector';

export class Rect {
    static zero = new Rect(0, 0, 0, 0);

    static circleBox(center: Vector2, radius: number) {
        return new Rect(
            center.x - radius,
            center.y - radius,
            center.x + radius,
            center.y + radius
        );
    }

    private _left = 0;
    private _top = 0;
    private _right = 0;
    private _bottom = 0;

    constructor(left: number, top: number, right: number, bottom: number);
    constructor(pos: Vector2, width: number, height: number);
    constructor(p1: Vector2, p2: Vector2);
    constructor(a: number | Vector2, b: number | Vector2, c?: number, d?: number) {
        if (typeof a === 'number') {
            this._left = a;
            this._top = b as number;
            this._right = c!;
            this._bottom = d!;
            if (this._left > this._right || this._top > this._bottom)
                throw new Error('invalid argument');
        }
        else {
            if (typeof b !== 'number') {
                c = b.y - a.y;
                b = b.x - a.x;
            }
            if (b < 0) {
                this._right = a.x;
                this._left = a.x + b;
            }
            else {
                this._left = a.x;
                this._right = a.x + b;
            }
            if (c! < 0) {
                this._bottom = a.y;
                this._top = a.y + c!;
            }
            else {
                this._top = a.y;
                this._bottom = a.y + c!;
            }
        }
    }

    get isZero() {
        return this.width === 0 || this.height === 0;
    }

    get left() {
        return this._left;
    }
    get top() {
        return this._top;
    }
    get right() {
        return this._right;
    }
    get bottom() {
        return this._bottom;
    }

    get width() {
        return this._right - this._left;
    }
    get height() {
        return this._bottom - this._top;
    }

    get topLeft() {
        return V(this._left, this._top);
    }
    get bottomRight() {
        return V(this._right, this._bottom);
    }
    get bottomLeft() {
        return V(this._left, this._bottom);
    }
    get topRight() {
        return V(this._right, this._top);
    }

    get size() {
        return V(this._right - this._left, this._bottom - this._top);
    }
    get center() {
        return V((this._left + this._right) / 2, (this._top + this._bottom) / 2);
    }

    get integerBounds() {
        return new Rect(
            Math.floor(this._left),
            Math.floor(this._top),
            1 - Math.ceil(-this._right),
            1 - Math.ceil(-this._bottom)
        );
    }

    at(pos: Vector2) {
        return new Rect(pos, this.width, this.height);
    }

    plusLeft(left: number) {
        return new Rect(this._left + left, this._top, this._right, this._bottom);
    }
    plusTop(top: number) {
        return new Rect(this._left, this._top + top, this._right, this._bottom);
    }
    plusRight(right: number) {
        return new Rect(this._left, this._top, this._right + right, this._bottom);
    }
    plusBottom(bottom: number) {
        return new Rect(this._left, this._top, this._right, this._bottom + bottom);
    }
    plus(left: number, top: number, right: number, bottom: number) {
        return new Rect(this._left + left, this._top + top, this._right + right, this._bottom + bottom);
    }

    extend(all: number): Rect;
    extend(x: number, y: number): Rect; // eslint-disable-line @typescript-eslint/unified-signatures
    extend(left: number, top: number, right: number, bottom: number): Rect;
    extend(left: number, top?: number, right?: number, bottom?: number) {
        if (top === undefined)
            top = left;
        if (right === undefined)
            right = left;
        if (bottom === undefined)
            bottom = top;
        return new Rect(this._left - left, this._top - top, this._right + right, this._bottom + bottom);
    }

    moveBy(x: number, y: number): Rect;
    moveBy(v: Vector2): Rect;
    moveBy(x: number | Vector2, y?: number) {
        if (typeof x === 'number') {
            return new Rect(
                this._left + x,
                this._top + y!,
                this._right + x,
                this._bottom + y!
            );
        }
        else {
            return new Rect(
                this._left + x.x,
                this._top + x.y,
                this._right + x.x,
                this._bottom + x.y
            );
        }
    }

    private _union(left: number, top: number, right: number, bottom: number) {
        let newLeft: number;
        let newTop: number;
        let newRight: number;
        let newBottom: number;
        if (this._left === this._right) {
            newLeft = left;
            newRight = right;
        }
        else {
            newLeft = Math.min(this._left, left);
            newRight = Math.max(this._right, right);
        }
        if (this._top === this._bottom) {
            newTop = top;
            newBottom = bottom;
        }
        else {
            newTop = Math.min(this._top, top);
            newBottom = Math.max(this._bottom, bottom);
        }
        return new Rect(newLeft, newTop, newRight, newBottom);
    }
    // integerUnion(v: Vector2) {
    //     let x = Math.floor(v.x);
    //     let y = Math.floor(v.y);
    //     return this._union(x, y, x + 1, y + 1);
    // }
    union(rect: Rect) {
        return this._union(rect._left, rect._top, rect._right, rect._bottom);
    }

    intersection(rect: Rect) {
        const left = Math.max(this._left, rect._left);
        const top = Math.max(this._top, rect._top);
        const right = Math.min(this._right, rect._right);
        const bottom = Math.min(this._bottom, rect._bottom);
        if (left >= right || top >= bottom)
            return Rect.zero;
        return new Rect(left, top, right, bottom);
    }

    // always returns false if one rect is empty
    intersects(rect: Rect) {
        const left = Math.max(this._left, rect._left);
        const right = Math.min(this._right, rect._right);
        if (left >= right)
            return false;
        const top = Math.max(this._top, rect._top);
        const bottom = Math.min(this._bottom, rect._bottom);
        if (top >= bottom)
            return false;
        return true;
    }

    // can be used with empty rects
    intersectsInclusive(rect: Rect) {
        return this._left <= rect._right && this._right >= rect._left && this._top <= rect._bottom && this._bottom >= rect._top;
    }

    includes(rect: Rect) {
        return rect._left >= this._left && rect._right <= this._right && rect._top >= this._top && rect._bottom <= this._bottom;
    }

    contains(v: Vector2) {
        return v.x >= this._left && v.x < this._right && v.y >= this._top && v.y < this._bottom;
    }

    clamp(v: Vector2) {
        return V(
            Math.min(Math.max(this._left, v.x), this._right),
            Math.min(Math.max(this._top, v.y), this._bottom)
        );
    }

    transform(transform: SimpleTransform | null, inverse = false) {
        if (transform === null)
            return this;
        if (inverse) {
            return new Rect(
                (this._left - transform.originOffset.x) / transform.scale,
                (this._top - transform.originOffset.y) / transform.scale,
                (this._right - transform.originOffset.x) / transform.scale,
                (this._bottom - transform.originOffset.y) / transform.scale
            );
        }
        else {
            return new Rect(
                this._left * transform.scale + transform.originOffset.x,
                this._top * transform.scale + transform.originOffset.y,
                this._right * transform.scale + transform.originOffset.x,
                this._bottom * transform.scale + transform.originOffset.y
            );
        }
    }

    excatEquals(other: Rect) {
        if (this === other)
            return true;
        return this._left === other._left && this._top === other._top && this._right === other._right && this._bottom === other._bottom;
    }

    toString(fractionDigits?: number) {
        if (fractionDigits === undefined)
            return `(${this.left}, ${this.top}, ${this.right}, ${this.bottom})`;
        return `(${this.left.toFixed(fractionDigits)}, ${this.top.toFixed(fractionDigits)}, ${this.right.toFixed(fractionDigits)}, ${this.bottom.toFixed(fractionDigits)})`;
    }
}
