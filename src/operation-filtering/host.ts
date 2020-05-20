import { MultiKeyMap, MultiKeySet } from '../collections';
import { Log } from '../logging';
import { ConstructorLike } from '../utils';
import { OperationFilter, OperationFilterContextTypeMap, OperationFilterProvider, OperationFilteringObject, operationFilterHostSymbol } from './common';

function compareFiltersByOrder(a: OperationFilter<any>, b: OperationFilter<any>) {
    return b.order - a.order;
}

type MapFromObject<T> = T extends OperationFilteringObject<infer U> ? U : never;

const emptyList: readonly any[] = [];

export class GlobalOperationFilterHost {
    private _typeFilterProviders = new MultiKeyMap<object, OperationFilterProvider<any>, OperationFilter<any>[]>();
    private _typeFilters = new MultiKeyMap<object, PropertyKey, Set<OperationFilter<any>>>();
    private _typeFilterLists = new MultiKeyMap<object, PropertyKey, OperationFilter<any>[]>();
    private _cleanTypes = new MultiKeySet<object, PropertyKey>();
    private _version = 0;

    get version() {
        return this._version;
    }

    addTypeFilters<T>(type: ConstructorLike<T>, filterProvider: OperationFilterProvider<MapFromObject<T>>) {
        const prototype = type.prototype;

        if (this._typeFilterProviders.has(prototype, filterProvider)) {
            Log.invalidArgument('warning', 'duplicate filter provider for type', { type, filterProvider });
            return;
        }

        const filters = [...filterProvider.getOperationFilters()];
        this._typeFilterProviders.set(prototype, filterProvider, filters);

        for (const filter of filters) {
            let set = this._typeFilters.get(prototype, filter.operation);
            if (set === undefined) {
                set = new Set();
                this._typeFilters.set(prototype, filter.operation, set);
            }
            set.add(filter);
        }

        this._cleanTypes.clear();
        this._version++;
    }

    removeTypeFilters<T extends OperationFilteringObject<TMap>, TMap>(type: ConstructorLike<T>, filterProvider: OperationFilterProvider<TMap>) {
        const prototype = type.prototype;

        const filters = this._typeFilterProviders.get(prototype, filterProvider);

        if (filters === undefined) {
            Log.invalidArgument('warning', 'missing filter provider for type', { type, filterProvider });
            return;
        }

        this._typeFilterProviders.delete(prototype, filterProvider);

        for (const filter of filters) {
            const set = this._typeFilters.get(prototype, filter.operation)!;
            set.delete(filter);
            if (set.size === 0)
                this._typeFilters.delete(prototype, filter.operation);
        }

        this._cleanTypes.clear();
        this._version++;
    }

    private _getTypeFilters<TMap, K extends keyof TMap>(instance: OperationFilteringObject<TMap>, operation: K): readonly OperationFilter<TMap, K>[] {
        const prototype = Object.getPrototypeOf(instance);

        if (this._cleanTypes.has(prototype, operation))
            return this._typeFilterLists.get(prototype, operation) as OperationFilter<TMap, K>[];

        const list = [];
        let currentPrototype = prototype;
        while (currentPrototype !== null) {
            const filters = this._typeFilters.get(currentPrototype, operation);
            if (filters !== undefined) {
                for (const filter of filters)
                    list.push(filter);
            }
            currentPrototype = Object.getPrototypeOf(currentPrototype);
        }
        list.sort(compareFiltersByOrder);

        this._cleanTypes.add(prototype, operation);
        this._typeFilterLists.set(prototype, operation, list);

        return list as OperationFilter<TMap, K>[];
    }

    hasTypeFilters<TMap, K extends keyof TMap>(instance: OperationFilteringObject<TMap>, operation: K): boolean {
        return this._getTypeFilters(instance, operation).length !== 0;
    }

    hasFilters<TMap, K extends keyof TMap>(instance: OperationFilteringObject<TMap>, operation: K): boolean {
        const instanceHost = instance[operationFilterHostSymbol];
        if (instanceHost?.hasInstanceFilters(operation) ?? false)
            return true;
        return this.hasTypeFilters(instance, operation);
    }

    process<TMap, K extends keyof TMap>(instance: OperationFilteringObject<TMap>, operation: K, context: OperationFilterContextTypeMap<TMap>[K]) {
        const instanceHost = instance[operationFilterHostSymbol];
        const instanceFilters = instanceHost === null ? emptyList : instanceHost.getInstanceFilters(operation);
        const typeFilters = this._getTypeFilters(instance, operation);
        FilteredOperationHandler.processCombined<TMap, TMap, K>(instanceFilters, typeFilters, context);
        context.finalize();
    }
}

export class OperationFilterHost<TMap> {
    private _operationHandlers = new Map<keyof TMap, FilteredOperationHandler<TMap, keyof TMap>>();
    private _filters = new Map<OperationFilterProvider<TMap>, OperationFilter<TMap>[]>();

    addFilters(filterProvider: OperationFilterProvider<TMap>) {
        if (this._filters.has(filterProvider)) {
            Log.invalidArgument('warning', 'duplicate filter provider', { filterProvider });
            return;
        }

        const filters = [...filterProvider.getOperationFilters()];
        this._filters.set(filterProvider, filters);

        for (const filter of filters) {
            let operationHandler = this._operationHandlers.get(filter.operation);
            if (operationHandler === undefined) {
                operationHandler = new FilteredOperationHandler();
                this._operationHandlers.set(filter.operation, operationHandler);
            }
            operationHandler.addFilter(filter);
        }
    }

    removeFilters(filterProvider: OperationFilterProvider<TMap>) {
        const filters = this._filters.get(filterProvider);

        if (filters === undefined) {
            Log.invalidArgument('warning', 'missing filter provider', { filterProvider });
            return;
        }

        this._filters.delete(filterProvider);

        for (const filter of filters) {
            const operationHandler = this._operationHandlers.get(filter.operation);
            if (operationHandler !== undefined)
                operationHandler.removeFilter(filter);
        }
    }

    hasFilters(filterProvider: OperationFilterProvider<TMap>) {
        return this._filters.has(filterProvider);
    }

    hasInstanceFilters<K extends keyof TMap>(operation: K): boolean {
        const operationHandler = this._operationHandlers.get(operation);
        return operationHandler?.hasFilters ?? false;
    }

    getInstanceFilters<K extends keyof TMap>(operation: K): readonly OperationFilter<TMap, K>[] {
        const operationHandler = this._operationHandlers.get(operation);
        if (operationHandler === undefined)
            return emptyList;
        return (operationHandler as FilteredOperationHandler<TMap, K>).getFilters();
    }
}

class FilteredOperationHandler<TMap, K extends keyof TMap> {
    static processCombined<TMap, TMap2, K extends keyof TMap & keyof TMap2>(instanceFilters: readonly OperationFilter<TMap, K>[], typeFilters: readonly OperationFilter<TMap2, K>[], context: OperationFilterContextTypeMap<TMap & TMap2>[K]) {
        let i1 = 0;
        let i2 = 0;

        while (i1 < instanceFilters.length && i2 < typeFilters.length) {
            if (!context.next())
                return;
            if (instanceFilters[i1].order < typeFilters[i2].order) {
                instanceFilters[i1].process(context);
                i1++;
            }
            else {
                typeFilters[i2].process(context);
                i2++;
            }
        }

        while (i1 < instanceFilters.length) {
            if (!context.next())
                return;
            instanceFilters[i1].process(context);
            i1++;
        }

        while (i2 < typeFilters.length) {
            if (!context.next())
                return;
            typeFilters[i2].process(context);
            i2++;
        }
    }

    private _filters: OperationFilter<TMap, K>[] = [];

    get hasFilters() {
        return this._filters.length !== 0;
    }

    addFilter(filter: OperationFilter<TMap, K>) {
        const order = filter.order;
        for (let i = 0; i < this._filters.length; i++) {
            if (this._filters[i].order > order) {
                this._filters.splice(i, 0, filter);
                return;
            }
        }
        this._filters.push(filter);
    }

    removeFilter(filter: OperationFilter<TMap, K>) {
        const index = this._filters.indexOf(filter);
        this._filters.splice(index, 1);
    }

    getFilters() {
        return this._filters;
    }
}
