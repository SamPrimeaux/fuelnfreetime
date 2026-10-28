export type SortKey = "catalog" | "name" | "newest" | "popular" | "mockups" | "price-low" | "price-high";
export type PrintMethod = "dtg" | "sublimation" | "engraving" | "etching" | "embroidery" | "uv" | "predefined";
export type FacetGroup = "category" | "printType" | "holiday" | "occasion";
export interface CatalogQuery {
  q: string; sort: SortKey; category: string[]; printType: PrintMethod[];
  holiday: string[]; occasion: string[]; hasMockups: boolean; available: boolean;
  recent: boolean; favorite: boolean; priceMin: number; priceMax: number | null; page: number;
}
export type CatalogFacetCounts = Record<FacetGroup,Record<string,number>>;
export declare const CATALOG_FACETS: Record<FacetGroup,readonly {readonly value:string;readonly label:string}[]>;
export declare const CATALOG_SORT_KEYS: readonly SortKey[];
export declare function readCatalogQuery(input?: URLSearchParams | string): CatalogQuery;
export declare function writeCatalogQuery(query: CatalogQuery): URLSearchParams;
export declare function catalogActiveFilterCount(query:CatalogQuery): number;
export declare function catalogTags(row:{tags_json?:string|null}):string[];
export declare function catalogFacetsFor(row:Record<string,unknown>):Record<FacetGroup,string[]>;
export declare function filterCatalogRows<T extends Record<string,unknown>>(rows:T[],query:CatalogQuery):{
  selected:(T & {_facets:Record<FacetGroup,string[]>})[];facets:CatalogFacetCounts;
};
