import { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS } from './generated/operations.generated.js';
import type { CompletefulOperationTypes } from './generated/types.generated.js';
export { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS };
export type { CompletefulOperationTypes } from './generated/types.generated.js';
export declare const DEFAULT_COMPLETEFUL_API_ORIGIN = "https://vxapi.completeful.com";
export type OperationName = keyof CompletefulOperationTypes;
export type CompletefulKeyMode = 'test' | 'live' | 'unknown' | 'missing';
type RequiredProperties<T> = {
    [P in keyof T]-?: Record<string, never> extends Pick<T, P> ? never : P;
}[keyof T];
type RequiredPath<T> = T extends {
    path: infer P;
} ? keyof P extends never ? {
    path?: never;
} : {
    path: P;
} : {
    path?: never;
};
type RequiredQuery<T> = T extends {
    query: infer Q;
} ? RequiredProperties<Q> extends never ? {
    query?: Q;
} : {
    query: Q;
} : {
    query?: never;
};
type RequiredBody<T> = T extends {
    body: infer B;
    bodyRequired: infer Required;
} ? Required extends true ? {
    body: B;
} : {
    body?: B;
} : {
    body?: never;
};
export type CompletefulCallOptions<K extends OperationName> = RequiredPath<CompletefulOperationTypes[K]> & RequiredQuery<CompletefulOperationTypes[K]> & RequiredBody<CompletefulOperationTypes[K]> & {
    idempotencyKey?: string | null;
};
type ProviderGroup = OperationName extends infer K ? K extends `${infer Group}.${string}` ? Group : never : never;
type ProviderMethod<K extends OperationName> = Record<string, never> extends CompletefulCallOptions<K> ? (options?: CompletefulCallOptions<K>) => Promise<CompletefulResponse<CompletefulOperationTypes[K]['response']>> : (options: CompletefulCallOptions<K>) => Promise<CompletefulResponse<CompletefulOperationTypes[K]['response']>>;
export type CompletefulResourceApi = {
    [Group in ProviderGroup]: {
        [K in OperationName as K extends `${Group}.${infer Method}` ? Method : never]: ProviderMethod<K>;
    };
};
export interface CompletefulResponse<T = unknown> {
    data: T;
    meta: {
        status: number;
        request_id: string | null;
        mode: string | null;
        dry_run: boolean;
    };
}
export interface CompletefulClientConfig {
    apiKey?: string | null;
    apiUrl?: string;
    allowLiveWrites?: boolean;
    fetchImpl?: typeof fetch;
}
export interface CompletefulRequestOptions {
    query?: Record<string, string | number | boolean | null | undefined> | null;
    body?: unknown;
    idempotencyKey?: string | null;
    headers?: HeadersInit | null;
}
export declare class CompletefulApiError extends Error {
    readonly status: number;
    readonly code: string | null;
    readonly requestId: string | null;
    readonly path: string | null;
    readonly remediation: string | null;
    readonly details: unknown;
    readonly providerBody: unknown;
    constructor(message: string, details?: {
        status?: number;
        code?: string | null;
        requestId?: string | null;
        path?: string | null;
        remediation?: string | null;
        details?: unknown;
        providerBody?: unknown;
    });
    toJSON(): {
        error: string;
        code: string | null;
        request_id: string | null;
        path: string | null;
        remediation: string | null;
        details: unknown;
    };
}
export declare class CompletefulContractError extends TypeError {
    readonly field: string | null;
    readonly status = 400;
    readonly code = "completeful_invalid_operation_input";
    constructor(message: string, field?: string | null);
}
export declare function completefulApiBase(apiUrl?: string): string;
export declare function completefulKeyMode(apiKey?: string | null): CompletefulKeyMode;
export declare function createCompletefulClient({ apiKey, apiUrl, allowLiveWrites, fetchImpl, }?: CompletefulClientConfig): {
    providerKey: "completeful";
    apiBase: string;
    keyMode: CompletefulKeyMode;
    allowLiveWrites: boolean;
    request: (method: string, path: string, opts?: CompletefulRequestOptions) => Promise<CompletefulResponse>;
    call: <K extends OperationName>(name: K, opts?: CompletefulCallOptions<K>) => Promise<CompletefulResponse<CompletefulOperationTypes[K]["response"]>>;
    api: CompletefulResourceApi;
    operations: Readonly<{
        [k: string]: (opts?: CompletefulCallOptions<OperationName>) => Promise<CompletefulResponse<unknown>>;
    }>;
    assertConfigured: () => void;
    assertMutationAllowed: () => void;
};
export type CompletefulClient = ReturnType<typeof createCompletefulClient>;
