import { ArgumentError, FailedAssertionError, InvalidOperationError, NotImplementedError, UnexpectedError } from './errors';

// do not change these values!
export enum LogLevel {
    Trace = 0,
    Debug = 1,
    Information = 2,
    Warning = 3,
    Error = 4,
    Fatal = 5
}

export interface LogMessage {
    level: LogLevel;
    source?: string;
    category?: string;
    error?: Error;
    message?: string;
    details?: any;
}

export type ErrorLevel = 'warning' | 'error' | 'fatal';

type StandardErrorType = new (message?: string) => Error;

export interface LogWriter {
    shouldLog(level: LogLevel): boolean;

    log(message: LogMessage): void;
}

const noopLogger: LogWriter = {
    shouldLog() { return false; },
    log() { }
};
Object.freeze(noopLogger);

export class Logger {
    private _logWriter: LogWriter | null;
    private _source: string | undefined;

    constructor(logWriter: LogWriter | null = null, source?: string) {
        this._logWriter = logWriter;
        this._source = source;
    }

    get source() {
        return this._source;
    }

    getLogWriter() {
        return this._logWriter === null ? noopLogger : this._logWriter;
    }

    setLogWriter(logger: LogWriter | null) {
        this._logWriter = logger;
    }

    private _fromStandardError(errorLevel: ErrorLevel | undefined, errorType: StandardErrorType, message: string, details?: any) {
        let error = new errorType(message);
        if (this._logWriter !== null) {
            let level = errorLevel === 'warning' ? LogLevel.Warning : errorLevel === 'error' ? LogLevel.Error : LogLevel.Fatal;
            this._logWriter.log({
                level,
                message,
                error,
                details,
                source: this._source
            });
        }
        return error;
    }

    notImplemented(level?: 'fatal', message?: string, details?: any): NotImplementedError;
    notImplemented(level: ErrorLevel, message?: string, details?: any): void;
    notImplemented(level?: ErrorLevel, message = 'not implemented', details?: any) {
        return this._fromStandardError(level, NotImplementedError, message, details);
    }

    invalidArgument(level?: 'fatal', message?: string, details?: any): ArgumentError;
    invalidArgument(level: ErrorLevel, message?: string, details?: any): void;
    invalidArgument(level?: ErrorLevel, message = 'invalid argument', details?: any) {
        return this._fromStandardError(level, ArgumentError, message, details);
    }

    assertFailed(level?: 'fatal', message?: string, details?: any): FailedAssertionError;
    assertFailed(level: ErrorLevel, message?: string, details?: any): void;
    assertFailed(level?: ErrorLevel, message = 'failed assertion', details?: any) {
        return this._fromStandardError(level, FailedAssertionError, message, details);
    }

    unexpected(level?: 'fatal', message?: string, details?: any): FailedAssertionError;
    unexpected(level: ErrorLevel, message?: string, details?: any): void;
    unexpected(level?: ErrorLevel, message = 'unexpected', details?: any) {
        return this._fromStandardError(level, UnexpectedError, message, details);
    }

    invalidOperation(level?: 'fatal', message?: string, details?: any): FailedAssertionError;
    invalidOperation(level: ErrorLevel, message?: string, details?: any): void;
    invalidOperation(level?: ErrorLevel, message = 'invalid operation', details?: any) {
        return this._fromStandardError(level, InvalidOperationError, message, details);
    }

    private _fromErrorMessage(level: LogLevel, message: string, details?: any) {
        let error = new Error(message);
        if (this._logWriter !== null) {
            this._logWriter.log({
                level,
                message,
                error,
                details,
                source: this._source
            });
        }
        return error;
    }

    warn(message: string, details?: any) {
        this._fromErrorMessage(LogLevel.Warning, message, details);
    }

    error(message: string, details?: any) {
        this._fromErrorMessage(LogLevel.Error, message, details);
    }

    fail(message: string, details?: any): Error {
        return this._fromErrorMessage(LogLevel.Fatal, message, details);
    }

    private _fromMessage(level: LogLevel, message: string, details?: any) {
        if (this._logWriter !== null) {
            this._logWriter.log({
                level,
                message,
                details,
                source: this._source
            });
        }
    }

    info(message: string, details?: any) {
        this._fromMessage(LogLevel.Information, message, details);
    }

    debug(message: string, details?: any) {
        this._fromMessage(LogLevel.Debug, message, details);
    }

    trace(message: string, details?: any) {
        this._fromMessage(LogLevel.Trace, message, details);
    }

    withSource(source: string) {
        return new Logger(this._logWriter, source);
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Log = new Logger();
