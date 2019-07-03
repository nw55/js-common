import { Awaitable, ConstructorLike } from '../utils';

export type ServiceType<T = unknown> = ConstructorLike<T>;

export type NamedServiceType<TMap = any> = keyof TMap;

export type AnyServiceType<TMap = any> = ServiceType | NamedServiceType<TMap>;

export interface ServiceProvider<TMap> {
    getService<T>(type: ServiceType<T>): T | null;
    getService<K extends keyof TMap>(type: K): TMap[K] | null;

    hasService(type: ServiceType): boolean;
    hasService(type: keyof TMap): boolean;

    requireService<T>(type: ServiceType<T>): T;
    requireService<K extends keyof TMap>(type: K): TMap[K];
}

export interface ServiceFactoryContext<TMap> {
    requireService<T>(type: ServiceType<T>): Promise<T>;
    requireService<K extends keyof TMap>(type: K): Promise<TMap[K]>;
}

export type ServiceFactory<TMapIn, T> = (context: ServiceFactoryContext<TMapIn>) => Awaitable<T>;

export type NamedServiceFactory<TMapOut, TMapIn, K extends keyof TMapOut> = (context: ServiceFactoryContext<TMapIn>) => Awaitable<TMapOut[K]>;

export type ServiceInfo = {
    type: ServiceType;
    factory: ServiceFactory<any, any>;
} | {
    type: NamedServiceType;
    factory: NamedServiceFactory<any, any, any>;
};

export type ServiceInitializer<TMapIn, T> = (service: T, context: ServiceFactoryContext<TMapIn>) => Awaitable;

export type NamedServiceInitializer<TMapOut, TMapIn, K extends keyof TMapOut> = (service: TMapOut[K], context: ServiceFactoryContext<TMapIn>) => Awaitable;

export type ServiceInitializerInfo = {
    type: ServiceType;
    initializer: ServiceInitializer<any, any>;
} | {
    type: NamedServiceType;
    initializer: NamedServiceInitializer<any, any, any>;
};
