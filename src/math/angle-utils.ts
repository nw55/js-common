export namespace angleUtils {
    export function degrees(a: number) {
        return a * 180 / Math.PI;
    }

    export function fromDegrees(d: number) {
        return d * Math.PI / 180;
    }

    export function positive(a: number) {
        return (a + Math.PI * 2) % (Math.PI * 2);
    }

    export function normalize(a: number) {
        a = positive(a);
        return a > Math.PI ? a - Math.PI * 2 : a;
    }
}
