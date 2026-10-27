import { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS } from './generated/operations.generated.js';
export { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS };
export const DEFAULT_COMPLETEFUL_API_ORIGIN = 'https://vxapi.completeful.com';
export class CompletefulApiError extends Error {
    status;
    code;
    requestId;
    path;
    remediation;
    details;
    providerBody;
    constructor(message, details = {}) {
        super(message);
        this.name = 'CompletefulApiError';
        this.status = details.status || 502;
        this.code = details.code || null;
        this.requestId = details.requestId || null;
        this.path = details.path || null;
        this.remediation = details.remediation || null;
        this.details = details.details || null;
        this.providerBody = details.providerBody || null;
    }
    toJSON() {
        return { error: this.message, code: this.code, request_id: this.requestId,
            path: this.path, remediation: this.remediation, details: this.details };
    }
}
export class CompletefulContractError extends TypeError {
    field;
    status = 400;
    code = 'completeful_invalid_operation_input';
    constructor(message, field = null) {
        super(message);
        this.field = field;
        this.name = 'CompletefulContractError';
    }
}
function invalid(msg, field = null) {
    throw new CompletefulContractError(msg, field);
}
export function completefulApiBase(apiUrl = DEFAULT_COMPLETEFUL_API_ORIGIN) {
    const configured = String(apiUrl || DEFAULT_COMPLETEFUL_API_ORIGIN).replace(/\/+$/, '');
    return configured.endsWith('/v1') ? configured : configured + '/v1';
}
export function completefulKeyMode(apiKey) {
    const key = String(apiKey || '');
    if (key.startsWith('capp_test_'))
        return 'test';
    if (key.startsWith('capp_live_'))
        return 'live';
    return key ? 'unknown' : 'missing';
}
const READ_ONLY_POSTS = new Set(['addresses.validate', 'printFiles.validate', 'orders.quote']);
function isObject(x) {
    return Boolean(x && typeof x === 'object' && !Array.isArray(x));
}
function requiredId(input, field) {
    if ((typeof input !== 'string' && typeof input !== 'number') ||
        !String(input) || String(input) === '.' || String(input) === '..' ||
        String(input).length > 256 || /[\x00-\x1f\x7f]/.test(String(input))) {
        return invalid('Invalid ' + field, field);
    }
    return encodeURIComponent(String(input));
}
function queryValue(value, schema, field) {
    if (Array.isArray(value))
        return value.map(x => String(x)).join(',');
    if (isObject(value))
        return invalid('Invalid ' + field, field);
    let v = value;
    if (schema.type === 'integer' || schema.type === 'number') {
        if (typeof v === 'string' && v.trim())
            v = Number(v);
        if (typeof v !== 'number' || !Number.isFinite(v) || (schema.type === 'integer' && !Number.isSafeInteger(v)))
            return invalid('Invalid numeric ' + field, field);
        if (typeof schema.minimum === 'number' && v < schema.minimum)
            return invalid('Below minimum ' + field, field);
        if (typeof schema.maximum === 'number' && v > schema.maximum)
            return invalid('Above maximum ' + field, field);
    }
    else if (schema.type === 'boolean') {
        if (typeof v !== 'boolean' && v !== 'true' && v !== 'false')
            return invalid('Invalid boolean ' + field, field);
    }
    else if (schema.type === 'string' && typeof v !== 'string') {
        return invalid('Invalid string ' + field, field);
    }
    if (Array.isArray(schema.enum) && !schema.enum.includes(v))
        return invalid('Invalid enum ' + field, field);
    return String(v);
}
export function createCompletefulClient({ apiKey, apiUrl = DEFAULT_COMPLETEFUL_API_ORIGIN, allowLiveWrites = false, fetchImpl = globalThis.fetch, } = {}) {
    if (typeof fetchImpl !== 'function')
        throw new TypeError('Completeful client requires fetch');
    const keyMode = completefulKeyMode(apiKey), base = completefulApiBase(apiUrl);
    function assertConfigured() {
        if (keyMode !== 'missing')
            return;
        throw new CompletefulApiError('Completeful API key is missing', { status: 503, code: 'completeful_not_configured',
            remediation: 'Resolve a Completeful API key through the host authority adapter.' });
    }
    function assertMutationAllowed() {
        assertConfigured();
        if (keyMode === 'test' || (keyMode === 'live' && allowLiveWrites))
            return;
        throw new CompletefulApiError('Completeful live writes are disabled', { status: 409, code: 'completeful_live_writes_disabled',
            remediation: 'Use a capp_test_ key or explicitly enable live writes in the host configuration.' });
    }
    async function request(method, path, opts = {}) {
        assertConfigured();
        if (!/^(GET|POST|PATCH|PUT|DELETE)$/.test(method))
            invalid('Unsupported HTTP method', 'method');
        if (!path.startsWith('/') || path.startsWith('//') || /[\r\n?#]/.test(path))
            invalid('Invalid provider path', 'path');
        // Defense in depth: even legacy/raw SDK consumers must not bypass
        // supplier write approval by skipping the typed named operation.
        const isValidationOnly = method === 'POST' &&
            (path === '/addresses/validate' || path === '/print-files/validate' ||
                /^\/shops\/[^/]+\/orders\/quote$/.test(path));
        if (method !== 'GET' && !isValidationOnly)
            assertMutationAllowed();
        const url = new URL(base + path);
        if (opts.query)
            for (const [name, value] of Object.entries(opts.query)) {
                if (value !== null && value !== undefined && value !== '')
                    url.searchParams.set(name, String(value));
            }
        const headers = new Headers(opts.headers || {});
        headers.set('Accept', 'application/json');
        headers.set('Authorization', 'Bearer ' + apiKey);
        const body = opts.body;
        let payload;
        if (body !== undefined && body !== null) {
            if (body instanceof FormData)
                payload = body;
            else {
                headers.set('Content-Type', 'application/json');
                payload = typeof body === 'string' ? body : JSON.stringify(body);
            }
        }
        if (opts.idempotencyKey)
            headers.set('Idempotency-Key', opts.idempotencyKey);
        const res = await fetchImpl(url.toString(), { method, headers, body: payload });
        const responseText = await res.text();
        let data = null;
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            }
            catch {
                data = { raw: responseText.slice(0, 4000) };
            }
        }
        const result = isObject(data) ? data : {};
        const requestId = res.headers.get('x-request-id') || res.headers.get('x-capp-request-id') ||
            (typeof result.request_id === 'string' ? result.request_id : null);
        const meta = { status: res.status, request_id: requestId,
            mode: res.headers.get('x-capp-mode'), dry_run: res.headers.get('x-capp-dry-run') === 'true' };
        if (!res.ok) {
            throw new CompletefulApiError(String(result.error || result.message || 'Completeful request failed (' + res.status + ')'), { status: res.status, code: typeof result.code === 'string' ? result.code : 'completeful_request_failed',
                requestId, path: typeof result.path === 'string' ? result.path : url.pathname,
                remediation: typeof result.remediation === 'string' ? result.remediation : null,
                details: result.details, providerBody: result });
        }
        return { data, meta };
    }
    async function call(name, opts = {}) {
        if (!Object.hasOwn(COMPLETEFUL_OPERATIONS, name))
            return invalid('Unknown Completeful operation ' + name, 'operation');
        const definition = COMPLETEFUL_OPERATIONS[name];
        const input = opts;
        const selectedPath = input.path || {};
        if (!isObject(selectedPath))
            invalid('Invalid path parameters', 'path');
        for (const name of Object.keys(selectedPath))
            if (!definition.pathParams.includes(name))
                invalid('Unknown path parameter ' + name, 'path.' + name);
        const route = definition.path.replace(/\{(\w+)\}/g, (_match, key) => requiredId(selectedPath[key], 'path.' + key));
        const q = input.query || {};
        if (!isObject(q))
            invalid('Query must be an object', 'query');
        const query = {};
        for (const key of definition.requiredQuery)
            if (q[key] === null || q[key] === undefined || q[key] === '')
                invalid('Missing query parameter ' + key, 'query.' + key);
        for (const [name, v] of Object.entries(q)) {
            if (!definition.queryParams.includes(name))
                invalid('Unknown query parameter ' + name, 'query.' + name);
            if (v !== null && v !== undefined)
                query[name] = queryValue(v, definition.querySchemas[name] || {}, 'query.' + name);
        }
        if (definition.bodyRequired && !isObject(input.body))
            invalid('JSON object body required', 'body');
        if (input.body !== undefined && input.body !== null && !isObject(input.body))
            invalid('JSON body must be an object', 'body');
        for (const name of definition.requiredBodyFields) {
            if (input.body?.[name] === undefined ||
                input.body?.[name] === null)
                invalid('Missing body field ' + name, 'body.' + name);
        }
        if ((definition.method === 'GET' || definition.method === 'DELETE') && input.body !== undefined)
            invalid('Unexpected body', 'body');
        if (input.idempotencyKey != null &&
            (typeof input.idempotencyKey !== 'string' || !input.idempotencyKey.trim() || input.idempotencyKey.length > 256))
            invalid('Invalid idempotency key', 'idempotencyKey');
        if (definition.method !== 'GET' && !READ_ONLY_POSTS.has(name))
            assertMutationAllowed();
        return request(definition.method, route, { query, body: input.body, idempotencyKey: input.idempotencyKey });
    }
    const operations = Object.freeze(Object.fromEntries(Object.keys(COMPLETEFUL_OPERATIONS).map(key => [key, (opts) => call(key, opts)])));
    const grouped = {};
    for (const key of Object.keys(COMPLETEFUL_OPERATIONS)) {
        const [group, method] = key.split('.');
        if (!grouped[group])
            grouped[group] = {};
        grouped[group][method] = (args) => call(key, args);
    }
    const api = Object.freeze(Object.fromEntries(Object.entries(grouped).map(([name, value]) => [name, Object.freeze(value)])));
    return { providerKey: 'completeful', apiBase: base, keyMode, allowLiveWrites: Boolean(allowLiveWrites),
        request, call, api, operations, assertConfigured, assertMutationAllowed };
}
