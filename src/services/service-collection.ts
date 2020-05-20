import { NamedServiceFactory, NamedServiceInitializer, ServiceFactory, ServiceInfo, ServiceInitializer, ServiceInitializerInfo, ServiceType } from './common';

type MapServiceDependecyType<TMap, T> = T extends keyof TMap ? TMap[T] : T extends ServiceType<infer U> ? U : T;

type MapServiceDependecyTypes<TMap, TDependncies extends ServiceDependency<TMap>[]> = {
    [K in keyof TDependncies]: MapServiceDependecyType<TMap, TDependncies[K]>;
};

type DefaultServiceConstructor<TMap, T, TDependncies extends ServiceDependency<TMap>[]> = ServiceType<T>
    & (new (...dependencies: MapServiceDependecyTypes<TMap, TDependncies>) => T);

function defaultServiceFactor<TMap, T, TDependncies extends ServiceDependency<TMap>[]>(constructor: DefaultServiceConstructor<TMap, T, TDependncies>, dependencies: TDependncies): ServiceFactory<TMap, T> {
    return async context => {
        const resolvedDependencies = [];
        for (const dependency of dependencies)
            resolvedDependencies.push(await context.requireService(dependency as any));
        return new constructor(...resolvedDependencies as any);
    };
}

type ServiceDependency<TMap> = keyof TMap | ServiceType;

export class ServiceCollection<TMapOut, TMapIn = TMapOut> {
    private _services: ServiceInfo[] = [];
    private _initializers: ServiceInitializerInfo[] = [];

    addService<T>(type: ServiceType<T>, factory: ServiceFactory<TMapIn, T>) {
        this._services.push({ type, factory });
    }

    addNamedService<K extends keyof TMapOut>(type: K, factory: NamedServiceFactory<TMapOut, TMapIn, K>) {
        this._services.push({ type, factory });
    }

    addDefaultService<T, TDependncies extends ServiceDependency<TMapIn>[]>(type: DefaultServiceConstructor<TMapIn, T, TDependncies>, ...dependencies: TDependncies) {
        this._services.push({ type, factory: defaultServiceFactor(type, dependencies) });
    }

    addInitializer<T>(type: ServiceType<T>, initializer: ServiceInitializer<TMapIn, T>) {
        this._initializers.push({ type, initializer });
    }

    addNamedInitializer<K extends keyof TMapOut>(type: K, initializer: NamedServiceInitializer<TMapOut, TMapIn, K>) {
        this._initializers.push({ type, initializer });
    }

    addDefaultNamedService<K extends keyof TMapOut, TDependncies extends ServiceDependency<TMapIn>[]>(type: K, constructor: DefaultServiceConstructor<TMapIn, TMapOut[K], TDependncies>, ...dependencies: TDependncies) {
        this._services.push({ type, factory: defaultServiceFactor(constructor, dependencies) });
    }

    get services(): Iterable<Readonly<ServiceInfo>> {
        return this._services;
    }

    get initializers(): Iterable<Readonly<ServiceInitializerInfo>> {
        return this._initializers;
    }
}
