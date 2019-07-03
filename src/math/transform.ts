import { Vector2 } from './vector';

export interface SimpleTransform {
    readonly originOffset: Vector2;
    readonly scale: number;
}
