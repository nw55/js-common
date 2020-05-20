import { MultiMap } from '../collections/multi-map';
import { Log } from '../logging';
import { PromiseSource, getIterableFirstElement } from '../utils';
import { AnyServiceType, ServiceFactoryContext, ServiceInfo, ServiceInitializerInfo, ServiceProvider } from './common';
import { ServiceCollection } from './service-collection';

export class ServiceLoader<TMap, TExternalMap = unknown> {
    private _serviceCollection = new ServiceCollection<TMap, TMap & TExternalMap>();
    private _context: SharedLoadingContext | null = null;
    private _loading = false;

    get serviceCollection() {
        return this._serviceCollection;
    }

    async load(externalServices: ServiceProvider<TExternalMap> | null = null) {
        if (this._context !== null || this._loading)
            throw Log.fail('invalid state');
        this._loading = true;

        const sharedContext = new SharedLoadingContext(this._serviceCollection, externalServices);

        sharedContext.beginLoad();

        await sharedContext.finishLoading();

        this._loading = false;
        this._context = sharedContext;
    }

    createServiceProvider(): ServiceProvider<TMap> {
        if (this._context === null)
            throw Log.fail('invalid state');
        return this._context.createServiceProvider(false);
    }

    createCombinedServiceProvider(): ServiceProvider<TMap & TExternalMap> {
        if (this._context === null)
            throw Log.fail('invalid state');
        return this._context.createServiceProvider(true);
    }
}

class SharedLoadingContext {
    private _services = new Map<AnyServiceType, ServiceInfo>();
    private _initializers = new MultiMap<AnyServiceType, ServiceInitializerInfo>();
    private _dependecyBlocked = new Map<AnyServiceType, AnyServiceType>();
    private _waitingContexts = new MultiMap<AnyServiceType, LoadingContext>();
    private _instances = new Map<AnyServiceType, any>();
    private _promises = new Map<LoadingContext, Promise<void>>();

    constructor(serviceCollection: ServiceCollection<any>, private _externalServices: ServiceProvider<any> | null) {
        for (const service of serviceCollection.services)
            this._services.set(service.type, service);
        for (const initializer of serviceCollection.initializers)
            this._initializers.add(initializer.type, initializer);
    }

    beginLoad() {
        for (const serviceType of this._initializers.keys()) {
            if (!this._services.has(serviceType))
                Log.warn('service initializer present without service', { serviceType });
        }

        for (const service of this._services.values()) {
            const initializers = this._initializers.get(service.type);
            const context = new LoadingContext(this, service, initializers);
            const promise = context.load();
            this._promises.set(context, promise);
        }
    }

    async finishLoading() {
        while (this._promises.size > 0) {
            await Promise.race(this._promises.values());
            this._detectCircularDependency();
        }
    }

    private _detectCircularDependency() {
        if (this._promises.size > 0) {
            let allBlocked = true;
            for (const loader of this._promises.keys()) {
                if (!this._dependecyBlocked.has(loader.type)) {
                    allBlocked = false;
                    break;
                }
            }
            if (allBlocked) {
                const service = getIterableFirstElement(this._promises.keys())!.type;
                let current: AnyServiceType | undefined = service;
                const services: AnyServiceType[] = [];
                do {
                    services.push(current!);
                    current = this._dependecyBlocked.get(current!);
                } while (current !== service);
                throw Log.fail('circular service dependency', services);
            }
        }
    }

    require(context: LoadingContext, dependency: AnyServiceType) {
        let instance = this._instances.get(dependency);
        if (instance !== undefined)
            return instance;
        if (!this._services.has(dependency)) {
            if (this._externalServices !== null) {
                instance = this._externalServices.getService(dependency as any);
                if (instance !== null)
                    return instance;
            }
            throw Log.fail('missing service dependency', { serviceType: context.type, dependency });
        }
        this._dependecyBlocked.set(context.type, dependency);
        this._detectCircularDependency();
        this._waitingContexts.add(dependency, context);
        return null;
    }

    provide(context: LoadingContext, instance: any) {
        this._promises.delete(context);
        this._instances.set(context.type, instance);
        for (const waitingContext of this._waitingContexts.get(context.type)) {
            this._dependecyBlocked.delete(waitingContext.type);
            waitingContext.dependencyResolved(instance);
        }
        this._waitingContexts.deleteAll(context.type);
    }

    createServiceProvider(combined: boolean) {
        if (combined && this._externalServices !== null)
            return new CombinedServiceProviderImpl(this._instances, this._externalServices);
        else
            return new ServiceProviderImpl(this._instances);
    }
}

class LoadingContext implements ServiceFactoryContext<any> {
    private _currentRequire: PromiseSource<any> | null = null;

    constructor(private _sharedContext: SharedLoadingContext, private _service: ServiceInfo, private _initializers: Iterable<ServiceInitializerInfo>) {
    }

    get type() {
        return this._service.type;
    }

    async load() {
        const instance = await this._service.factory(this);
        for (const initializer of this._initializers)
            await initializer.initializer(instance, this);
        this._sharedContext.provide(this, instance);
    }

    dependencyResolved(instance: any) {
        if (this._currentRequire === null)
            throw Log.assertFailed('fatal', 'resolving unrequired dependency');
        this._currentRequire.resolve(instance);
        this._currentRequire = null;
    }

    requireService(type: AnyServiceType) {
        const instance = this._sharedContext.require(this, type);
        if (instance !== null)
            return Promise.resolve(instance);
        this._currentRequire = new PromiseSource();
        return this._currentRequire.promise;
    }
}

class ServiceProviderImpl implements ServiceProvider<any> {
    constructor(private _instances: Map<AnyServiceType, any>) {
    }

    getService(type: AnyServiceType) {
        const instance = this._instances.get(type);
        if (instance === undefined)
            return null;
        return instance;
    }

    hasService(type: AnyServiceType) {
        return this._instances.has(type);
    }

    requireService(type: AnyServiceType) {
        const instance = this._instances.get(type);
        if (instance === undefined)
            throw Log.fail('service not found', type);
        return instance;
    }
}

class CombinedServiceProviderImpl implements ServiceProvider<any> {
    constructor(private _instances: Map<AnyServiceType, any>, private _parent: ServiceProvider<any>) {
    }

    getService(type: AnyServiceType) {
        let instance = this._instances.get(type);
        if (instance === undefined)
            instance = this._parent.getService(type as any);
        if (instance === undefined)
            return null;
        return instance;
    }

    hasService(type: AnyServiceType) {
        return this._instances.has(type) || this._parent.hasService(type as any);
    }

    requireService(type: AnyServiceType) {
        let instance = this._instances.get(type);
        if (instance === undefined)
            instance = this._parent.requireService(type as any);
        return instance;
    }
}
