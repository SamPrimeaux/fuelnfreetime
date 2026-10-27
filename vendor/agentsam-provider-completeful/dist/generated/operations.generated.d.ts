export declare const COMPLETEFUL_CONTRACT: {
    readonly title: "Completeful Partner API";
    readonly version: "0.1.0";
    readonly sha256: "5aba75fabf74a4363399cf3de2f68d1b32ee33d4cad912d151f02ea9b442438e";
    readonly operationCount: 55;
    readonly pathCount: 44;
};
export declare const COMPLETEFUL_OPERATIONS: {
    readonly "referrals.summary": {
        readonly method: "GET";
        readonly path: "/referrals/summary";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Referral commission summary for the API key owner";
    };
    readonly "referrals.tier1": {
        readonly method: "GET";
        readonly path: "/referrals/tier1";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["limit", "offset", "sort"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 200;
                readonly default: 50;
            };
            readonly offset: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly default: 0;
            };
            readonly sort: {
                readonly type: "string";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List directly referred sellers with commission aggregates";
    };
    readonly "referrals.tier2": {
        readonly method: "GET";
        readonly path: "/referrals/tier2";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["limit", "offset", "sort"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 200;
                readonly default: 50;
            };
            readonly offset: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly default: 0;
            };
            readonly sort: {
                readonly type: "string";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List second-tier referred sellers with commission aggregates";
    };
    readonly "referrals.payouts": {
        readonly method: "GET";
        readonly path: "/referrals/payouts";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["limit", "offset", "tier", "from", "to"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly minimum: 1;
                readonly maximum: 200;
                readonly default: 50;
            };
            readonly offset: {
                readonly type: "integer";
                readonly minimum: 0;
                readonly default: 0;
            };
            readonly tier: {
                readonly type: "integer";
                readonly enum: readonly [1, 2];
            };
            readonly from: {
                readonly type: "string";
                readonly format: "date-time";
            };
            readonly to: {
                readonly type: "string";
                readonly format: "date-time";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Per-sale referral payout ledger";
    };
    readonly "shops.list": {
        readonly method: "GET";
        readonly path: "/shops";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List shops the API key has access to";
    };
    readonly "shops.create": {
        readonly method: "POST";
        readonly path: "/shops";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["name"];
        readonly summary: "Register a new sub-shop (multi-shop integrators only)";
    };
    readonly "shops.get": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get a shop";
    };
    readonly "shops.disconnect": {
        readonly method: "DELETE";
        readonly path: "/shops/{shopId}/connection";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Disconnect a sub-shop (cannot disconnect the partner primary)";
    };
    readonly "catalog.products": {
        readonly method: "GET";
        readonly path: "/catalog/products";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["limit", "offset", "cursor", "search", "marketplace_eligible", "include"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly default: 50;
                readonly maximum: 200;
            };
            readonly offset: {
                readonly type: "integer";
                readonly default: 0;
            };
            readonly cursor: {
                readonly type: "string";
            };
            readonly search: {
                readonly type: "string";
            };
            readonly marketplace_eligible: {
                readonly type: "boolean";
            };
            readonly include: {
                readonly type: "string";
                readonly example: "variants,print_locations,images,mockups,shipping";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List catalog products";
    };
    readonly "catalog.semantic": {
        readonly method: "GET";
        readonly path: "/catalog/products/semantic";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["q", "limit", "include"];
        readonly requiredQuery: readonly ["q"];
        readonly querySchemas: {
            readonly q: {
                readonly type: "string";
                readonly maxLength: 200;
                readonly example: "cozy gift for dog lovers";
            };
            readonly limit: {
                readonly type: "integer";
                readonly default: 12;
                readonly maximum: 50;
            };
            readonly include: {
                readonly type: "string";
                readonly example: "variants,print_locations,images,mockups,shipping";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Semantic catalog search";
    };
    readonly "catalog.product": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly ["include"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly include: {
                readonly type: "string";
                readonly example: "variants,print_locations,images,mockups,shipping";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Fetch enriched catalog product";
    };
    readonly "catalog.variants": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}/variants";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List catalog product variants";
    };
    readonly "catalog.printLocations": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}/print-locations";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List enabled print locations for a catalog product";
    };
    readonly "catalog.mockups": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}/mockups";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly ["print_location_id"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly print_location_id: {
                readonly type: "string";
                readonly format: "uuid";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List mockups";
    };
    readonly "catalog.shipping": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}/shipping";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Catalog shipping cost columns";
    };
    readonly "addresses.validate": {
        readonly method: "POST";
        readonly path: "/addresses/validate";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Validate and normalize an address";
    };
    readonly "printFiles.validate": {
        readonly method: "POST";
        readonly path: "/print-files/validate";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["art_url"];
        readonly summary: "Validate a print file URL against print-location requirements";
    };
    readonly "designs.list": {
        readonly method: "GET";
        readonly path: "/designs";
        readonly pathParams: readonly [];
        readonly queryParams: readonly ["limit", "offset", "cursor", "search", "shop_id", "external_user_id", "collection"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly default: 50;
                readonly maximum: 200;
            };
            readonly offset: {
                readonly type: "integer";
                readonly default: 0;
            };
            readonly cursor: {
                readonly type: "string";
            };
            readonly search: {
                readonly type: "string";
            };
            readonly shop_id: {
                readonly type: "string";
                readonly format: "uuid";
            };
            readonly external_user_id: {
                readonly type: "string";
            };
            readonly collection: {
                readonly type: "string";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List designs";
    };
    readonly "designs.create": {
        readonly method: "POST";
        readonly path: "/designs";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["name"];
        readonly summary: "Create a design (design_template)";
    };
    readonly "designs.getExport": {
        readonly method: "GET";
        readonly path: "/designs/exports/{exportId}";
        readonly pathParams: readonly ["exportId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get a design export job/result";
    };
    readonly "designs.createExport": {
        readonly method: "POST";
        readonly path: "/designs/{designId}/exports";
        readonly pathParams: readonly ["designId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Create a design export";
    };
    readonly "designs.get": {
        readonly method: "GET";
        readonly path: "/designs/{designId}";
        readonly pathParams: readonly ["designId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get a design";
    };
    readonly "designs.update": {
        readonly method: "PATCH";
        readonly path: "/designs/{designId}";
        readonly pathParams: readonly ["designId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Patch a design";
    };
    readonly "designs.delete": {
        readonly method: "DELETE";
        readonly path: "/designs/{designId}";
        readonly pathParams: readonly ["designId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Delete a design";
    };
    readonly "assets.create": {
        readonly method: "POST";
        readonly path: "/assets";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["content_base64"];
        readonly summary: "Upload an asset from inline bytes";
    };
    readonly "assets.fromUrl": {
        readonly method: "POST";
        readonly path: "/assets/from-url";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["url"];
        readonly summary: "Import an asset from a public URL";
    };
    readonly "assets.get": {
        readonly method: "GET";
        readonly path: "/assets/{assetId}";
        readonly pathParams: readonly ["assetId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get an uploaded asset";
    };
    readonly "products.list": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/products";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly ["limit", "offset", "cursor"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly limit: {
                readonly type: "integer";
                readonly default: 50;
                readonly maximum: 200;
            };
            readonly offset: {
                readonly type: "integer";
                readonly default: 0;
            };
            readonly cursor: {
                readonly type: "string";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List products in a specific shop";
    };
    readonly "products.create": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/products";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["catalog_product_id"];
        readonly summary: "Create a shop product (store_products)";
    };
    readonly "products.get": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/products/{productId}";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get a shop product";
    };
    readonly "products.update": {
        readonly method: "PATCH";
        readonly path: "/shops/{shopId}/products/{productId}";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Partial update of a shop product";
    };
    readonly "products.delete": {
        readonly method: "DELETE";
        readonly path: "/shops/{shopId}/products/{productId}";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Delete a shop product";
    };
    readonly "products.publish": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/products/{productId}/publish";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Start publish (emits product:publish:started)";
    };
    readonly "products.ackPublishSuccess": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/products/{productId}/publishing_succeeded";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Acknowledge publish success";
    };
    readonly "products.ackPublishFailure": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/products/{productId}/publishing_failed";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Acknowledge publish failure";
    };
    readonly "products.unpublish": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/products/{productId}/unpublish";
        readonly pathParams: readonly ["shopId", "productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Unpublish a product";
    };
    readonly "orders.list": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/orders";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List orders";
    };
    readonly "orders.create": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/orders";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["shipping_address", "line_items"];
        readonly summary: "Create an order (idempotent via Idempotency-Key OR external_order_id)";
    };
    readonly "orders.get": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/orders/{orderId}";
        readonly pathParams: readonly ["shopId", "orderId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get an order";
    };
    readonly "orders.cancel": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/orders/{orderId}/cancel";
        readonly pathParams: readonly ["shopId", "orderId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Cancel order";
    };
    readonly "webhooks.list": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/webhooks";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List webhook subscriptions";
    };
    readonly "webhooks.create": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/webhooks";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["url", "topic"];
        readonly summary: "Register a webhook subscription (one row per topic)";
    };
    readonly "webhooks.get": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Get a webhook";
    };
    readonly "webhooks.update": {
        readonly method: "PATCH";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Update a webhook (url / status)";
    };
    readonly "webhooks.delete": {
        readonly method: "DELETE";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Delete a webhook";
    };
    readonly "webhooks.test": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}/test";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Enqueue a synthetic ping delivery";
    };
    readonly "webhooks.deliveries": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}/deliveries";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "List recent delivery attempts";
    };
    readonly "mockups.render": {
        readonly method: "POST";
        readonly path: "/mockups/renders";
        readonly pathParams: readonly [];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["mockup_id", "art_url"];
        readonly summary: "Render a catalog mockup";
    };
    readonly "mockups.getRender": {
        readonly method: "GET";
        readonly path: "/mockups/renders/{renderId}";
        readonly pathParams: readonly ["renderId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Fetch mockup render status";
    };
    readonly "catalog.bySku": {
        readonly method: "GET";
        readonly path: "/catalog/products/by-sku/{sku}";
        readonly pathParams: readonly ["sku"];
        readonly queryParams: readonly ["include"];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {
            readonly include: {
                readonly type: "string";
                readonly example: "variants,print_locations,images,mockups,shipping";
            };
        };
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Fetch catalog product by SKU";
    };
    readonly "catalog.assets": {
        readonly method: "GET";
        readonly path: "/catalog/products/{productId}/assets";
        readonly pathParams: readonly ["productId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Fetch catalog product assets";
    };
    readonly "orders.quote": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/orders/quote";
        readonly pathParams: readonly ["shopId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: true;
        readonly requiredBodyFields: readonly ["shipping_address", "line_items"];
        readonly summary: "Quote an order without persisting it";
    };
    readonly "orders.lookup": {
        readonly method: "GET";
        readonly path: "/shops/{shopId}/orders/lookup/{externalOrderId}";
        readonly pathParams: readonly ["shopId", "externalOrderId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Find an order by external_order_id";
    };
    readonly "webhooks.rotateSecret": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}/rotate-secret";
        readonly pathParams: readonly ["shopId", "webhookId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Rotate a webhook signing secret";
    };
    readonly "webhooks.redeliver": {
        readonly method: "POST";
        readonly path: "/shops/{shopId}/webhooks/{webhookId}/deliveries/{deliveryId}/redeliver";
        readonly pathParams: readonly ["shopId", "webhookId", "deliveryId"];
        readonly queryParams: readonly [];
        readonly requiredQuery: readonly [];
        readonly querySchemas: {};
        readonly bodyRequired: false;
        readonly requiredBodyFields: readonly [];
        readonly summary: "Create a redelivery attempt from a prior delivery row";
    };
};
