import { requireType, testType, Type } from '@nw55/common';
import { assert } from 'chai';
import { describe, test } from 'mocha';

describe('type-checking', () => {
    test('String', () => {
        const type = Type.from(String);
        assert.isTrue(testType(type, 'string'));
        assert.isFalse(testType(type, {}));
    });

    test('literal', () => {
        const type = Type.from(1);
        assert.isTrue(testType(type, 1));
        assert.isFalse(testType(type, 2));
    });

    test('array', () => {
        const type = Type.array(String);
        assert.isTrue(testType(type, []));
        assert.isTrue(testType(type, ['str']));
        assert.isFalse(testType(type, [123]));
    });

    test('union', () => {
        const type = Type.union(String, Number);
        assert.isTrue(testType(type, 'string'));
        assert.isTrue(testType(type, 123));
        assert.isFalse(testType(type, true));
    });

    test('nested union', () => {
        const type = Type.union(String, Type.union(Number, Boolean));
        assert.isTrue(testType(type, 'string'));
        assert.isTrue(testType(type, 123));
        assert.isTrue(testType(type, true));
        assert.isFalse(testType(type, []));
    });

    test('plain object', () => {
        const type = Type.plainObject({}, {
            a: String
        });
        assert.isTrue(testType(type, { a: 'string' }));
        assert.isTrue(testType(type, { a: 'string', b: 123 }));
        assert.isFalse(testType(type, {}));
        assert.isFalse(testType(type, { a: 123 }));
    });

    test('plain object: partial', () => {
        const type = Type.plainObject({ partial: true }, {
            a: String
        });
        assert.isTrue(testType(type, { a: 'string' }));
        assert.isTrue(testType(type, {}));
        assert.isFalse(testType(type, { a: 123 }));
    });

    test('plain object: no excess properties', () => {
        const type = Type.plainObject({ noExcessProperties: true }, {
            a: String
        });
        assert.isTrue(testType(type, { a: 'string' }));
        assert.isFalse(testType(type, {}));
        assert.isFalse(testType(type, { a: 'string', b: 'string' }));
    });

    test('tuple', () => {
        const type = Type.from([String, Number] as const);
        assert.isTrue(testType(type, ['a', 1]));
        assert.isFalse(testType(type, ['a']));
        assert.isFalse(testType(type, ['a', 1, 2]));
    });

    test('optional', () => {
        const type = Type.optional(String);
        assert.isTrue(testType(type, undefined));
        assert.isTrue(testType(type, 'string'));
        assert.isFalse(testType(type, null));
        assert.isFalse(testType(type, 1));
    });

    test('optional with plain object', () => {
        const type = Type.from({
            a: String,
            b: Type.optional(String)
        });
        assert.isTrue(testType(type, { a: 'string', b: 'string' }));
        assert.isTrue(testType(type, { a: 'string', b: undefined }));
        assert.isTrue(testType(type, { a: 'string' }));
        assert.isFalse(testType(type, { b: 'string' }));
        assert.isFalse(testType(type, {}));
    });

    test('record', () => {
        const type = Type.record(Number);
        assert.isTrue(testType(type, { a: 1, b: 2 }));
        assert.isTrue(testType(type, { a: 1 }));
        assert.isTrue(testType(type, {}));
        assert.isFalse(testType(type, { a: 1, b: 'string' }));
        assert.isFalse(testType(type, { a: 'string' }));
    });

    test('unchecked', () => {
        const type = Type.unchecked<unknown>();
        assert.isTrue(testType(type, 1));
        assert.isTrue(testType(type, ''));
        assert.isTrue(testType(type, {}));
    });

    test('complex type', () => {
        const type = Type.from({
            a: String,
            b: Type.array(Number)
        });
        const matchingValue = {
            a: 'string',
            b: [1, 2]
        };
        const failingValue = {
            a: 'a',
            b: ['b']
        };
        assert.isTrue(testType(type, matchingValue));
        assert.isFalse(testType(type, failingValue));
        requireType(type, matchingValue);
        assert.throws(() => requireType(type, failingValue));
    });
});
