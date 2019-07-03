import { DefaultConstructor } from '../utils';
import { NamedServiceFactory, NamedServiceInitializer, ServiceFactory, ServiceInfo, ServiceInitializer, ServiceInitializerInfo, ServiceType } from './common';

export class ServiceCollection<TMapOut, TMapIn = TMapOut> {
    private _services: ServiceInfo[] = [];
    private _initializers: ServiceInitializerInfo[] = [];

    addService<T>(type: ServiceType<T>, factory: ServiceFactory<TMapIn, T>) {
        this._services.push({ type, factory });
    }

    addNamedService<K extends keyof TMapOut>(type: K, factory: NamedServiceFactory<TMapOut, TMapIn, K>) {
        this._services.push({ type, factory });
    }

    addDefaultService<T>(type: ServiceType<T> & DefaultConstructor<T>) {
        this._services.push({ type, factory: () => new type() });
    }

    addInitializer<T>(type: ServiceType<T>, initializer: ServiceInitializer<TMapIn, T>) {
        this._initializers.push({ type, initializer });
    }

    addNamedInitializer<K extends keyof TMapOut>(type: K, initializer: NamedServiceInitializer<TMapOut, TMapIn, K>) {
        this._initializers.push({ type, initializer });
    }

    addDefaultNamedService<K extends keyof TMapOut>(type: K, constructor: DefaultConstructor<TMapOut[K]>) {
        this._services.push({ type, factory: () => new constructor() });
    }

    get services(): Iterable<Readonly<ServiceInfo>> {
        return this._services;
    }

    get initializers(): Iterable<Readonly<ServiceInitializerInfo>> {
        return this._initializers;
    }
}
