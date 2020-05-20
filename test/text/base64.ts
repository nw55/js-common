import { base64, utf8 } from '@nw55/common';
import { assert } from 'chai';
import { describe, test } from 'mocha';

// Test Vectors from RFC 4648
const testVectors: [Uint8Array, string][] = [
    [utf8.getBytes(''), ''],
    [utf8.getBytes('f'), 'Zg=='],
    [utf8.getBytes('fo'), 'Zm8='],
    [utf8.getBytes('foo'), 'Zm9v'],
    [utf8.getBytes('foob'), 'Zm9vYg=='],
    [utf8.getBytes('fooba'), 'Zm9vYmE='],
    [utf8.getBytes('foobar'), 'Zm9vYmFy']
];

describe('base64', () => {
    test('encode the RFC 4648 test vectors', () => {
        for (const [input, expected] of testVectors) {
            const output = base64.getString(input);
            assert.equal(output, expected);
        }
    });

    test('decode the RFC 4648 test vectors', () => {
        for (const [expected, input] of testVectors) {
            const output = base64.getBytes(input);
            assert.deepEqual(output, expected);
        }
    });
});
