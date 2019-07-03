import { Log } from '../logging';
import { OperationFilter, OperationFilterContextTypeMap, OperationFilterProvider } from './common';

class FilteredOperationHandler<TMap, K extends keyof TMap> {
    private _filters: OperationFilter<TMap, K>[] = [];

    get hasFilters() {
        return this._filters.length !== 0;
    }

    addFilter(filter: OperationFilter<TMap, K>) {
        let order = filter.order;
        for (let i = 0; i < this._filters.length; i++) {
            if (this._filters[i].order > order) {
                this._filters.splice(i, 0, filter);
                return;
            }
        }
        this._filters.push(filter);
    }

    removeFilter(filter: OperationFilter<TMap, K>) {
        let index = this._filters.indexOf(filter);
        this._filters.splice(index, 1);
    }

    process(context: OperationFilterContextTypeMap<TMap>[K]) {
        for (let filter of this._filters) {
            if (!context.next())
                break;
            filter.process(context);
        }
    }
}

export class OperationFilterHost<TMap> {
    private _operationHandlers = new Map<keyof TMap, FilteredOperationHandler<TMap, keyof TMap>>();
    private _filters = new Map<OperationFilterProvider<TMap>, OperationFilter<TMap, keyof TMap>[]>();

    addFilters(filterProvider: OperationFilterProvider<TMap>) {
        if (this._filters.has(filterProvider)) {
            Log.invalidArgument('warning', 'duplicate filter provider', filterProvider);
            return;
        }
        let filters = [...filterProvider.getOperationFilters()];
        for (let filter of filters) {
            let operationHandler = this._operationHandlers.get(filter.operation);
            if (operationHandler === undefined) {
                operationHandler = new FilteredOperationHandler();
                this._operationHandlers.set(filter.operation, operationHandler);
            }
            operationHandler.addFilter(filter);
        }
        this._filters.set(filterProvider, filters);
    }

    removeFilters(filterProvider: OperationFilterProvider<TMap>) {
        let filters = this._filters.get(filterProvider);
        if (filters === undefined) {
            Log.invalidArgument('warning', 'missing filter provider', filterProvider);
            return;
        }
        for (let filter of filters) {
            let operationHandler = this._operationHandlers.get(filter.operation);
            if (operationHandler !== undefined)
                operationHandler.removeFilter(filter);
        }
        this._filters.delete(filterProvider);
    }

    hasFilters(operation: keyof TMap) {
        let operationHandler = this._operationHandlers.get(operation);
        return operationHandler !== undefined && operationHandler.hasFilters;
    }

    process<K extends keyof TMap>(operation: K, context: OperationFilterContextTypeMap<TMap>[K]) {
        let operationHandler = this._operationHandlers.get(operation);
        if (operationHandler !== undefined)
            operationHandler.process(context);
        context.finalize();
    }
}
