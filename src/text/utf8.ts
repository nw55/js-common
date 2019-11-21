import { Log } from '../logging';

// from old nw55/ts-core
// TODO may need some more refactoring/cleanup

const UTF16_LEAD_SURROGATE_IDENTIFIER = 0xD800; // high
const UTF16_TRAIL_SURROGATE_IDENTIFIER = 0xDC00; // low
const UTF16_SURROGATE_VALUE_MASK = 0x3FF; // last 10 bits
const UTF16_SURROGATE_VALUE_OFFSET = 0x10000;
const UTF16_SURROGATE_LOW_VALUE = 0xD800;
const UTF16_SURROGATE_HIGH_VALUE = 0xDFFF;
const UTF16_LEAD_SURROGATE_MASK = 0xFFC00; // high
const UTF16_TRAIL_SURROGATE_MASK = 0x3FF; // low
const UTF8_1BYTE_LAST_CODE_POINT = 0x007F;
const UTF8_2BYTE_LAST_CODE_POINT = 0x07FF;
const UTF8_3BYTE_LAST_CODE_POINT = 0xFFFF;
const UTF8_UPPER_END = 0x10FFFF;

const ERROR_MISSING_SURROGATE = 'format: missing surrogate';
const ERROR_RANGE_EXCEEDED = 'not supported: character range exceeded';
const ERROR_BUFFER_OVERFLOW = 'buffer overflow';

const isFiniteNonNegativeNumber = (a: number) => typeof a === 'number' && isFinite(a) && a >= 0;

function throwError(message: string): never {
    throw Log.fail(message);
}

// internal function does not validate arguments
function encode_utf8_getByteCount(str: string, startIndex: number, length: number): number {
    let count = 0;
    let surrogate: number | undefined = undefined;
    for (let i = startIndex; i < startIndex + length; i++) {
        let charCode = str.charCodeAt(i);
        if (surrogate !== undefined) {
            if ((charCode & UTF16_TRAIL_SURROGATE_IDENTIFIER) === UTF16_TRAIL_SURROGATE_IDENTIFIER) {
                charCode = (((surrogate & UTF16_SURROGATE_VALUE_MASK) << 10) | (charCode & UTF16_SURROGATE_VALUE_MASK)) + UTF16_SURROGATE_VALUE_OFFSET;
                surrogate = undefined;
            }
            else
                throwError(ERROR_MISSING_SURROGATE);
        }
        else if ((charCode & UTF16_LEAD_SURROGATE_IDENTIFIER) === UTF16_LEAD_SURROGATE_IDENTIFIER) {
            surrogate = charCode;
            continue;
        }
        count++; // utf-8 always at least 1 byte
        if (charCode > UTF8_1BYTE_LAST_CODE_POINT)
            count++; // second byte
        if (charCode > UTF8_2BYTE_LAST_CODE_POINT)
            count++; // third byte
        if (charCode > UTF8_3BYTE_LAST_CODE_POINT)
            count++; // fourth byte
        if (charCode > UTF8_UPPER_END)
            throwError(ERROR_RANGE_EXCEEDED);
    }
    if (surrogate !== undefined)
        throwError(ERROR_MISSING_SURROGATE);
    return count;
}

// internal function does not validate arguments, returns byte length
function encode_utf8_getBytes(str: string, startIndex: number, length: number, bytes: Uint8Array, byteOffset: number, maxByteOffset: number): number {
    let pos = byteOffset;
    let surrogate: number | undefined = undefined;
    for (let i = startIndex; i < startIndex + length; i++) {
        let charCode = str.charCodeAt(i);
        if (surrogate !== undefined) {
            if ((charCode & UTF16_TRAIL_SURROGATE_IDENTIFIER) === UTF16_TRAIL_SURROGATE_IDENTIFIER) {
                charCode = (((surrogate & UTF16_SURROGATE_VALUE_MASK) << 10) | (charCode & UTF16_SURROGATE_VALUE_MASK)) + UTF16_SURROGATE_VALUE_OFFSET;
                surrogate = undefined;
            }
            else
                throwError(ERROR_MISSING_SURROGATE);
        }
        else if ((charCode & UTF16_LEAD_SURROGATE_IDENTIFIER) === UTF16_LEAD_SURROGATE_IDENTIFIER) {
            surrogate = charCode;
            continue;
        }
        if (charCode > UTF8_UPPER_END) {
            throwError(ERROR_RANGE_EXCEEDED);
        }
        else if (charCode > UTF8_3BYTE_LAST_CODE_POINT) {
            // 4 bytes
            if (pos + 4 > maxByteOffset)
                throwError(ERROR_BUFFER_OVERFLOW);
            bytes[pos++] = 0xf0 | (charCode & 0x1c0000) >>> 18;
            bytes[pos++] = 0x80 | (charCode & 0x3f000) >>> 12;
            bytes[pos++] = 0x80 | (charCode & 0xfc0) >>> 6;
            bytes[pos++] = 0x80 | charCode & 0x3f;
        }
        else if (charCode > UTF8_2BYTE_LAST_CODE_POINT) {
            // 3 bytes
            if (pos + 3 > maxByteOffset)
                throwError(ERROR_BUFFER_OVERFLOW);
            bytes[pos++] = 0xe0 | (charCode & 0xf000) >>> 12;
            bytes[pos++] = 0x80 | (charCode & 0xfc0) >>> 6;
            bytes[pos++] = 0x80 | charCode & 0x3f;
        }
        else if (charCode > UTF8_1BYTE_LAST_CODE_POINT) {
            // 2 bytes
            if (pos + 2 > maxByteOffset)
                throwError(ERROR_BUFFER_OVERFLOW);
            bytes[pos++] = 0xc0 | (charCode & 0x7c0) >>> 6;
            bytes[pos++] = 0x80 | charCode & 0x3f;
        }
        else {
            // 1 byte
            if (pos + 1 > maxByteOffset)
                throwError(ERROR_BUFFER_OVERFLOW);
            bytes[pos++] = charCode;
        }
    }
    if (surrogate !== undefined)
        throwError(ERROR_MISSING_SURROGATE);
    return pos - byteOffset;
}

// internal function does not validate arguments
function decode_utf8_bytes(bytes: Uint8Array, byteOffset: number, byteCount: number): string {
    let result = '';
    let sequenceValue = 0;
    let sequencePartsLeft = 0;
    for (let i = byteOffset; i < byteOffset + byteCount; i++) {
        let codePoint = bytes[i];
        if (sequencePartsLeft > 0) {
            if ((codePoint & 0x80) === 0x80 && (codePoint & 0x40) === 0) {
                sequencePartsLeft--;
                sequenceValue = sequenceValue << 6 | codePoint & 0x3f;
            }
            else
                throwError('format: invalid sequence byte');
            if (sequencePartsLeft > 0)
                continue;
            codePoint = sequenceValue;
        }
        else if ((codePoint & 0x80) === 0x80) {
            if ((codePoint & 0x40) === 0)
                throwError('format: invalid sequence continuation without sequence start');
            if ((codePoint & 0x20) === 0) {
                // 1 additional byte, 5 code point bits
                sequenceValue = codePoint & 0x1f;
                sequencePartsLeft = 1;
            }
            else if ((codePoint & 0x10) === 0) {
                // 2 additional bytes, 4 code point bits
                sequenceValue = codePoint & 0xf;
                sequencePartsLeft = 2;
            }
            else if ((codePoint & 0x8) === 0) {
                // 3 additional bytes, 3 code point bits
                sequenceValue = codePoint & 0x7;
                sequencePartsLeft = 3;
            }
            else
                throwError('format: sequence too long');
            continue;
        }
        if (codePoint > UTF8_UPPER_END)
            throwError(ERROR_RANGE_EXCEEDED);
        if (codePoint < UTF16_SURROGATE_VALUE_OFFSET) {
            if (codePoint >= UTF16_SURROGATE_LOW_VALUE && codePoint <= UTF16_SURROGATE_HIGH_VALUE)
                throwError('not supported: utf-16 reserved value');
            result += String.fromCharCode(codePoint);
        }
        else {
            // surrogate pair required
            codePoint -= UTF16_SURROGATE_VALUE_OFFSET;
            let leadSurrogate = UTF16_LEAD_SURROGATE_IDENTIFIER | (codePoint & UTF16_LEAD_SURROGATE_MASK) >>> 10;
            let trailSurrogate = UTF16_TRAIL_SURROGATE_IDENTIFIER | codePoint & UTF16_TRAIL_SURROGATE_MASK;
            result += String.fromCharCode(leadSurrogate);
            result += String.fromCharCode(trailSurrogate);
        }
    }
    if (sequencePartsLeft > 0)
        throwError('format: missing sequence byte');
    return result;
}

export namespace utf8 {
    export function getByteCount(str: string, startIndex = 0, length = str.length - startIndex): number {
        if (isFiniteNonNegativeNumber(startIndex) || startIndex > str.length)
            throw Log.invalidArgument();
        if (isFiniteNonNegativeNumber(length) || length + startIndex > str.length)
            throw Log.invalidArgument();

        return encode_utf8_getByteCount(str, startIndex, length);
    }

    export function writeBytes(buffer: Uint8Array, bufferOffset: number, str: string, startIndex = 0, length = str.length - startIndex): number {
        if (!isFiniteNonNegativeNumber(bufferOffset) || bufferOffset >= buffer.length)
            throw Log.invalidArgument();
        if (!isFiniteNonNegativeNumber(startIndex) || startIndex > str.length)
            throw Log.invalidArgument();
        if (!isFiniteNonNegativeNumber(length) || length + startIndex > str.length)
            throw Log.invalidArgument();

        let byteLength = encode_utf8_getBytes(str, startIndex, length, buffer, bufferOffset, buffer.length);
        return byteLength;
    }

    export function getBytes(str: string, startIndex = 0, length = str.length - startIndex): Uint8Array {
        if (!isFiniteNonNegativeNumber(startIndex) || startIndex > str.length)
            throw Log.invalidArgument();
        if (!isFiniteNonNegativeNumber(length) || length + startIndex > str.length)
            throw Log.invalidArgument();

        let byteCount = encode_utf8_getByteCount(str, startIndex, length);
        let buffer = new Uint8Array(byteCount);
        encode_utf8_getBytes(str, startIndex, length, buffer, 0, byteCount);
        return buffer;
    }

    export function getString(bytes: Uint8Array, byteOffset = 0, byteCount = bytes.length - byteOffset): string {
        if (!isFiniteNonNegativeNumber(byteOffset) || byteOffset > bytes.length)
            throw Log.invalidArgument();
        if (!isFiniteNonNegativeNumber(byteCount) || byteCount + byteOffset > bytes.length)
            throw Log.invalidArgument();

        return decode_utf8_bytes(bytes, byteOffset, byteCount);
    }
}
