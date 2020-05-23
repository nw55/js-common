import { CheckableType, TypeCheckError, TypeCheckResult, TypeDefinition, TypeFromDefinition } from './common';
import { Type } from './types';

const NESTED_MESSAGE_INDENT = '  ';

function formatNestedMessage(indent: string, error: TypeCheckError): string {
    let message = `${indent}Type mismatch${error.path !== '' ? ` at ${error.path}` : ''}: ${error.message}`;
    for (const nestedError of error.nestedErrors)
        message += '\n' + formatNestedMessage(indent + NESTED_MESSAGE_INDENT, nestedError);
    return message;
}

function formatFirstNestedMessage(result: TypeCheckResult) {
    if (result.errors.length === 0)
        return '';
    let currentError = result.errors[0];
    let path = '';
    while (true) {
        path += currentError.path;
        if (currentError.nestedErrors.length === 0)
            break;
        currentError = currentError.nestedErrors[0];
    }
    return `Type mismatch${path !== '' ? ` at ${path}` : ''}: ${currentError.message}`;
}

function formatErrorMessage(result: TypeCheckResult, baseMessage: string) {
    let message = baseMessage;
    for (const error of result.errors)
        message += '\n' + formatNestedMessage('', error);
    return message;
}

export function testType<D extends TypeDefinition>(typeDefinition: D, value: unknown): value is TypeFromDefinition<D> {
    const type = Type.from(typeDefinition);
    const result = type[CheckableType.check](value, { returnEarly: true, returnDetails: false });
    return result.success;
}

export function requireType<D extends TypeDefinition>(typeDefinition: D, value: unknown, detailedError = false): asserts value is TypeFromDefinition<D> {
    const type = Type.from(typeDefinition);
    const result = type[CheckableType.check](value, { returnEarly: true, returnDetails: true });
    if (!result.success) {
        const message = detailedError
            ? formatErrorMessage(result, 'The specified value does not match the required type.')
            : formatFirstNestedMessage(result);
        throw new TypeError(message);
    }
}
