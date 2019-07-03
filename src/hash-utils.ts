export namespace hashUtils {
    // based on https://stackoverflow.com/a/7616484
    export function stringHashCode(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            let ch = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + ch;
            hash |= 0;
        }
        return hash;
    }

    // based on https://stackoverflow.com/a/1646913
    export function combineHashCodes(...values: number[]) {
        let hash = 17;
        for (let value of values)
            hash = (hash * 31 + value) | 0;
        return hash;
    }
}
