import { ArgumentError } from '../errors';
import { Mutable } from '../utils';
import { CheckableType, TypeCheckOptions, TypeCheckResult, TypeDefinition, TypeFromDefinition } from './common';

type UnionTypeFromTupleDefinition<T extends any[]> = {
    [P in keyof T]: TypeFromDefinition<T[P]>;
}[Exclude<keyof T, keyof []>];

type PartialTypeFromObjectDefinition<T extends {}> = {
    [P in keyof T]?: TypeFromDefinition<T[P]>;
};

export namespace Type {
    export type Of<T> = T extends CheckableType ? CheckableType.ExtractType<T> : never;

    function createObjectPropertiesMap(typeDefinition: {}) {
        const map = new Map<string, CheckableType>();
        for (const [key, value] of Object.entries(typeDefinition))
            map.set(key, from(value as any));
        return map;
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
        return new PlainObjectType(createObjectPropertiesMap(typeDefinition), false);
    }

    export function from<T extends TypeDefinition>(typeDefinition: T): CheckableType<TypeFromDefinition<T>> {
        return fromDefinition(typeDefinition);
    }

    export function union<T extends TypeDefinition[]>(...typeDefinitions: T): CheckableType<UnionTypeFromTupleDefinition<T>> {
        return new UnionType(typeDefinitions.map(from as any));
    }

    export function array<T extends TypeDefinition>(typeDefinition: T): CheckableType<TypeFromDefinition<T>[]> {
        return new ArrayType(from(typeDefinition));
    }

    export function partial<T extends Record<string, TypeDefinition>>(typeDefinition: T): CheckableType<PartialTypeFromObjectDefinition<T>> {
        return new PlainObjectType(createObjectPropertiesMap(typeDefinition), true);
    }
}

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

class PlainObjectType<T> implements CheckableType<T> {
    constructor(private _types: Map<string, CheckableType>, private _partial: boolean) {
    }

    [CheckableType.check](value: unknown, options: TypeCheckOptions): TypeCheckResult<T> {
        const result: Mutable<TypeCheckResult> = {
            success: true,
            errors: []
        };

        if (isPlainObject(value)) {
            for (const [key, type] of this._types) {
                if (key in value) {
                    const propertyValue = value[key];
                    const propertyResult = type[CheckableType.check](propertyValue, options);
                    if (!propertyResult.success) {
                        result.success = false;
                        if (options.returnDetails) {
                            result.errors.push({
                                path: '.' + key,
                                message: 'Property value in plain object doese not match the type.',
                                nestedErrors: propertyResult.errors
                            });
                        }
                        if (options.returnEarly)
                            break;
                    }
                }
                else if (!this._partial) {
                    result.success = false;
                    if (options.returnDetails) {
                        result.errors.push({
                            path: '.' + key,
                            message: 'Missing property in plain object.',
                            nestedErrors: []
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
    constructor(private _types: CheckableType[]) {
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
