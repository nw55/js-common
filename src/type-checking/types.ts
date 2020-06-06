import { ArgumentError } from '../errors';
import { Mutable } from '../utils';
import { CheckableType, TypeCheckOptions, TypeCheckResult, TypeDefinition, TypeFromDefinition } from './common';

type UnionTypeFromTupleDefinition<T extends any[]> = {
    [P in keyof T]: TypeFromDefinition<T[P]>;
}[Exclude<keyof T, keyof []>];

type PartialTypeFromObjectDefinition<T extends {}> = {
    [P in keyof T]?: TypeFromDefinition<T[P]>;
};

class LiteralType<T> implements CheckableType<T> {
    constructor(private _value: unknown) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const success = value === this._value;
        return {
            success,
            errors: !success && options.returnDetails ? [{
                path: '',
                message: `Value ${String(value)} does not match literal type ${String(this._value)}.`,
                nestedErrors: []
            }] : []
        };
    }
}

class TypeofType<T> implements CheckableType<T> {
    constructor(private _type: string) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const success = typeof value === this._type;
        return {
            success,
            errors: !success && options.returnDetails ? [{
                path: '',
                message: `Value of type ${typeof value} does not match expected type ${this._type}.`,
                nestedErrors: []
            }] : []
        };
    }
}

function isPlainObject(obj: unknown): obj is Record<PropertyKey, unknown> {
    if (typeof obj !== 'object')
        return false;
    const prototype = Object.getPrototypeOf(obj);
    return prototype === null || prototype === Object.prototype;
}

interface PlainObjectProperty {
    key: PropertyKey;
    type: CheckableType;
    required: boolean;
}

interface PlainObjectOptions {
    noExcessProperties?: boolean;
    partial?: boolean;
}

function pathForPropertyKey(key: PropertyKey) {
    if (typeof key === 'string' && /^[A-Za-z_$][\w$]*$/.test(key))
        return '.' + key;
    return `[${String(key)}]`;
}

class PlainObjectType<T> implements CheckableType<T> {
    private _allowedPropertyKeys: Set<PropertyKey> | null = null;

    constructor(private _properties: PlainObjectProperty[], noExcessProperties: boolean) {
        if (noExcessProperties)
            this._allowedPropertyKeys = new Set();
        for (const property of _properties) {
            if (property.type instanceof OptionalType) {
                property.type = property.type.type;
                property.required = false;
            }
            if (noExcessProperties)
                this._allowedPropertyKeys!.add(property.key);
        }
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const result: Mutable<TypeCheckResult> = {
            success: true,
            errors: []
        };

        if (isPlainObject(value)) {
            for (const { key, type, required } of this._properties) {
                if (key in value) {
                    const propertyValue = value[key as string];
                    if (propertyValue === undefined && !required)
                        continue;
                    const propertyResult = type[CheckableType.check](propertyValue, options);
                    if (!propertyResult.success) {
                        result.success = false;
                        if (options.returnDetails) {
                            result.errors.push({
                                path: pathForPropertyKey(key),
                                message: 'Property value in plain object doese not match the type.',
                                nestedErrors: propertyResult.errors
                            });
                        }
                        if (options.returnEarly)
                            break;
                    }
                }
                else if (required) {
                    result.success = false;
                    if (options.returnDetails) {
                        result.errors.push({
                            path: pathForPropertyKey(key),
                            message: 'Missing property in plain object.',
                            nestedErrors: []
                        });
                    }
                    if (options.returnEarly)
                        break;
                }
            }
            if (this._allowedPropertyKeys !== null && (result.success || !options.returnEarly)) {
                for (const key of Object.keys(value)) {
                    if (!this._allowedPropertyKeys.has(key)) {
                        result.success = false;
                        if (options.returnDetails) {
                            result.errors.push({
                                path: pathForPropertyKey(key),
                                message: 'Excess property in plain object.',
                                nestedErrors: []
                            });
                        }
                        if (options.returnEarly)
                            break;
                    }
                }
            }
        }
        else {
            result.success = false;
            if (options.returnDetails) {
                result.errors.push({
                    path: '',
                    message: 'Value is not a plain object.',
                    nestedErrors: []
                });
            }
        }

        return result;
    }
}

class TupleType<T> implements CheckableType<T> {
    constructor(private _types: CheckableType[]) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const result: Mutable<TypeCheckResult> = {
            success: true,
            errors: []
        };

        if (Array.isArray(value)) {
            if (value.length === this._types.length) {
                for (let i = 0; i < this._types.length; i++) {
                    const elementValue = value[i];
                    const elementResult = this._types[i][CheckableType.check](elementValue, options);
                    if (!elementResult.success) {
                        result.success = false;
                        if (options.returnDetails) {
                            result.errors.push({
                                path: `[${i}]`,
                                message: 'Property value in tuple doese not match the type.',
                                nestedErrors: elementResult.errors
                            });
                        }
                        if (options.returnEarly)
                            break;
                    }
                }
            }
            else {
                result.success = false;
                if (options.returnDetails) {
                    result.errors.push({
                        path: '',
                        message: `Length ${value.length} of tuple does not match expected length ${this._types.length}.`,
                        nestedErrors: []
                    });
                }
            }
        }
        else {
            result.success = false;
            if (options.returnDetails) {
                result.errors.push({
                    path: '',
                    message: 'Value is not an array.',
                    nestedErrors: []
                });
            }
        }

        return result;
    }
}

class ArrayType<T> implements CheckableType<T> {
    constructor(private _type: CheckableType) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const result: Mutable<TypeCheckResult> = {
            success: true,
            errors: []
        };

        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const elementValue = value[i];
                const elementResult = this._type[CheckableType.check](elementValue, options);
                if (!elementResult.success) {
                    result.success = false;
                    if (options.returnDetails) {
                        result.errors.push({
                            path: `[${i}]`,
                            message: 'Property value in array doese not match the type.',
                            nestedErrors: elementResult.errors
                        });
                    }
                    if (options.returnEarly)
                        break;
                }
            }
        }
        else {
            result.success = false;
            if (options.returnDetails) {
                result.errors.push({
                    path: '',
                    message: 'Value is not an array.',
                    nestedErrors: []
                });
            }
        }

        return result;
    }
}

class UnionType<T> implements CheckableType<T> {
    private _types: CheckableType[] = [];

    constructor(types: CheckableType[]) {
        for (const type of types) {
            if (type instanceof UnionType)
                this._types.push(...type._types);
            else
                this._types.push(type);
        }
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const unionResult: TypeCheckResult = {
            success: false,
            errors: []
        };
        for (let i = 0; i < this._types.length; i++) {
            const type = this._types[i];
            const result = type[CheckableType.check](value, options);
            if (result.success)
                return { success: true, errors: [] };
            if (options.returnDetails) {
                unionResult.errors.push({
                    path: '',
                    message: `Type #${i} of the union type does not match.`,
                    nestedErrors: result.errors
                });
            }
        }
        return unionResult;
    }
}

class OptionalType<T> implements CheckableType<T> {
    constructor(public readonly type: CheckableType) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        if (value !== undefined) {
            const innerResult = this.type[CheckableType.check](value, options);
            if (!innerResult.success) {
                return {
                    success: false,
                    errors: [{
                        path: '',
                        message: `Optional type does not match since the value is not undefined and does not match the type.`,
                        nestedErrors: innerResult.errors
                    }]
                };
            }
        }
        return { success: true, errors: [] };
    }
}

class RecordType<T> implements CheckableType<T> {
    constructor(private _type: CheckableType) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const result: Mutable<TypeCheckResult> = {
            success: true,
            errors: []
        };

        if (isPlainObject(value)) {
            for (const [key, propertyValue] of Object.entries(value)) {
                const propertyResult = this._type[CheckableType.check](propertyValue, options);
                if (!propertyResult.success) {
                    result.success = false;
                    if (options.returnDetails) {
                        result.errors.push({
                            path: pathForPropertyKey(key),
                            message: 'Property value in record object doese not match the type.',
                            nestedErrors: propertyResult.errors
                        });
                    }
                    if (options.returnEarly)
                        break;
                }
            }
        }
        else {
            result.success = false;
            if (options.returnDetails) {
                result.errors.push({
                    path: '',
                    message: 'Value is not a plain array.',
                    nestedErrors: []
                });
            }
        }

        return result;
    }
}

export namespace Type {
    export type Of<T> = T extends CheckableType ? CheckableType.ExtractType<T> : never;

    export const literalUndefined = new LiteralType<undefined>(undefined);
    export const literalNull = new LiteralType<null>(null);
    export const literalTrue = new LiteralType<true>(true);
    export const literalFalse = new LiteralType<false>(false);

    function getObjectPropertiesInfo(typeDefinition: {}, required: boolean) {
        return Object.entries(typeDefinition).map<PlainObjectProperty>(([key, value]) => ({
            key,
            type: fromDefinition(value as any),
            required
        }));
    }

    function fromDefinition(typeDefinition: TypeDefinition): CheckableType {
        const type = typeof typeDefinition;
        if (typeDefinition === null || typeDefinition === undefined || type === 'string' || type === 'number' || type === 'boolean')
            return new LiteralType(typeDefinition);
        if (typeDefinition === String)
            return new TypeofType('string');
        if (typeDefinition === Number)
            return new TypeofType('number');
        if (typeDefinition === Boolean)
            return new TypeofType('boolean');
        if (typeof typeDefinition !== 'object')
            throw new ArgumentError();
        if (CheckableType.test(typeDefinition))
            return typeDefinition;
        if (Array.isArray(typeDefinition))
            return new TupleType(typeDefinition.map(fromDefinition));
        return new PlainObjectType(getObjectPropertiesInfo(typeDefinition, true), false);
    }

    export function from<T extends TypeDefinition>(typeDefinition: T): CheckableType<TypeFromDefinition<T>> {
        return fromDefinition(typeDefinition);
    }

    export function union<T extends TypeDefinition[]>(...typeDefinitions: T): CheckableType<UnionTypeFromTupleDefinition<T>> {
        return new UnionType(typeDefinitions.map(fromDefinition));
    }

    export function array<T extends TypeDefinition>(typeDefinition: T): CheckableType<TypeFromDefinition<T>[]> {
        return new ArrayType(fromDefinition(typeDefinition));
    }

    export function plainObject<T extends Record<string, TypeDefinition>>(options: PlainObjectOptions, typeDefinition: T): CheckableType<PartialTypeFromObjectDefinition<T>> {
        return new PlainObjectType(getObjectPropertiesInfo(typeDefinition, !(options.partial ?? false)), options.noExcessProperties ?? false);
    }

    export function partial<T extends Record<string, TypeDefinition>>(typeDefinition: T): CheckableType<PartialTypeFromObjectDefinition<T>> {
        return plainObject({ partial: true }, typeDefinition);
    }

    // behaves like a union with undefined but is specially handled when used in plain objects
    export function optional<T extends TypeDefinition>(typeDefinition: T): CheckableType<TypeFromDefinition<T> | undefined> {
        return new OptionalType(fromDefinition(typeDefinition));
    }

    export function record<T extends TypeDefinition>(typeDefinition: T): CheckableType<Record<PropertyKey, TypeFromDefinition<T>>> {
        return new RecordType(fromDefinition(typeDefinition));
    }

    const uncheckedType: CheckableType = {
        [CheckableType.check]() {
            return { success: true, errors: [] };
        }
    };

    export function unchecked<T>(): CheckableType<T> {
        return uncheckedType;
    }

    export const unknown = unchecked<unknown>();
}
