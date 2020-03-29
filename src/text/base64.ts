import { Log } from '../logging';

const ALPHABET = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'
];

const PAD = '=';

const CHAR_CODE_CAPITAL_A = 'A'.charCodeAt(0);
const CHAR_CODE_CAPITAL_Z = 'Z'.charCodeAt(0);
const CHAR_CODE_SMALL_A = 'a'.charCodeAt(0);
const CHAR_CODE_SMALL_Z = 'z'.charCodeAt(0);
const CHAR_CODE_ZERO = '0'.charCodeAt(0);
const CHAR_CODE_NINE = '9'.charCodeAt(0);
const CHAR_CODE_PLUS = '+'.charCodeAt(0);
const CHAR_CODE_SOLIDUS = '/'.charCodeAt(0);

function getValue(charCode: number) {
    if (charCode >= CHAR_CODE_CAPITAL_A && charCode <= CHAR_CODE_CAPITAL_Z)
        return charCode - CHAR_CODE_CAPITAL_A;
    if (charCode >= CHAR_CODE_SMALL_A && charCode <= CHAR_CODE_SMALL_Z)
        return charCode - CHAR_CODE_SMALL_A + 26;
    if (charCode >= CHAR_CODE_ZERO && charCode <= CHAR_CODE_NINE)
        return charCode - CHAR_CODE_ZERO + 52;
    if (charCode === CHAR_CODE_PLUS)
        return 62;
    if (charCode === CHAR_CODE_SOLIDUS)
        return 63;
    throw Log.fail('input is not valid base64');
}

export namespace base64 {
    export function getString(bytes: Uint8Array, byteOffset = 0, byteCount = bytes.length - byteOffset, pad = true): string {
        if (byteOffset < 0 || byteCount < 0 || byteOffset + byteCount > bytes.length)
            throw Log.invalidArgument();

        let pos = byteOffset;
        let end = byteOffset + byteCount;
        let result = '';

        while (pos + 3 <= end) {
            let value = bytes[pos++] << 16 | bytes[pos++] << 8 | bytes[pos++];
            result += ALPHABET[value >> 18] +
                ALPHABET[(value >> 12) & 0x3f] +
                ALPHABET[(value >> 6) & 0x3f] +
                ALPHABET[value & 0x3f];
        }

        if (end - pos === 2) {
            let value = bytes[pos++] << 16 | bytes[pos++] << 8;
            result += ALPHABET[value >> 18] +
                ALPHABET[(value >> 12) & 0x3f] +
                ALPHABET[(value >> 6) & 0x3f];
            if (pad)
                result += PAD;
        }
        else if (end - pos === 1) {
            let value = bytes[pos++] << 16;
            result += ALPHABET[value >> 18] +
                ALPHABET[(value >> 12) & 0x3f];
            if (pad)
                result += PAD + PAD;
        }

        return result;
    }

    function getByteCountAndUnpaddedLength(str: string, startIndex: number, length: number): [number, number] {
        let rem = length % 4;
        let byteCount = (length - rem) / 4 * 3;
        let unpaddedLength = length;

        switch (rem) {
            case 0:
                if (str.charAt(startIndex + length - 1) === PAD) {
                    if (str.charAt(startIndex + length - 2) === PAD) {
                        byteCount -= 2;
                        unpaddedLength -= 2;
                    }
                    else {
                        byteCount -= 1;
                        unpaddedLength -= 1;
                    }
                }
                break;
            case 2:
                byteCount += 1;
                break;
            case 3:
                byteCount += 2;
                break;
            default:
                throw Log.fail('input is not valid base64');
        }

        return [byteCount, unpaddedLength];
    }

    function decode(buffer: Uint8Array, bufferOffset: number, str: string, startIndex: number, length: number): number {
        let [byteCount, unpaddedLength] = getByteCountAndUnpaddedLength(str, startIndex, length);

        if (bufferOffset + byteCount > buffer.length)
            throw Log.invalidArgument('fatal', 'buffer too small');

        let pos = startIndex;
        let end = startIndex + unpaddedLength;
        let bufferPos = bufferOffset;

        while (pos + 4 <= end) {
            let value = getValue(str.charCodeAt(pos++)) << 18
                | getValue(str.charCodeAt(pos++)) << 12
                | getValue(str.charCodeAt(pos++)) << 6
                | getValue(str.charCodeAt(pos++));
            buffer[bufferPos++] = value >> 16;
            buffer[bufferPos++] = (value >> 8) & 0xff;
            buffer[bufferPos++] = value & 0xff;
        }

        if (end - pos === 3) {
            let value = getValue(str.charCodeAt(pos++)) << 18
                | getValue(str.charCodeAt(pos++)) << 12
                | getValue(str.charCodeAt(pos++)) << 6;
            buffer[bufferPos++] = value >> 16;
            buffer[bufferPos++] = (value >> 8) & 0xff;
        }
        else if (end - pos === 2) {
            let value = getValue(str.charCodeAt(pos++)) << 18
                | getValue(str.charCodeAt(pos++)) << 12;
            buffer[bufferPos++] = value >> 16;
        }

        return byteCount;
    }

    export function writeBytes(buffer: Uint8Array, bufferOffset: number, str: string, startIndex = 0, length = str.length - startIndex): number {
        if (bufferOffset < 0 || bufferOffset > buffer.length)
            throw Log.invalidArgument();
        if (startIndex < 0 || length < 0 || startIndex + length > str.length)
            throw Log.invalidArgument();

        return decode(buffer, bufferOffset, str, startIndex, length);
    }

    export function getBytes(str: string, startIndex = 0, length = str.length - startIndex): Uint8Array {
        if (startIndex < 0 || length < 0 || startIndex + length > str.length)
            throw Log.invalidArgument();

        let [byteCount] = getByteCountAndUnpaddedLength(str, startIndex, length);

        let buffer = new Uint8Array(byteCount);

        decode(buffer, 0, str, startIndex, length);

        return buffer;
    }
}
