export interface MerchCollectionRuleCondition { field: "title" | "slug" | "collection"; operator: "contains" | "equals" | "starts_with"; value: string }
export interface MerchCollectionRules { mode: "manual" | "automatic" | "hybrid"; match: "all" | "any"; conditions: MerchCollectionRuleCondition[]; excludedIds: number[] }
export interface MerchAssortmentRecipe { id:string; label:string; caption:string; slots:readonly string[] }
export const MERCH_ASSORTMENT_RECIPES: readonly MerchAssortmentRecipe[];
export function assortmentSearchTerms(id:string):string[];
export interface AssortmentCatalogItem { id?:string; catalog_product_id?:string; completeful_product_id?:string; available?:number|boolean; variant_count?:number; print_location_count?:number; mockup_count?:number; name?:string; [key:string]:unknown }
export interface AssortmentSlotMatch { slot:string; search:string; candidates:AssortmentCatalogItem[]; recommended:AssortmentCatalogItem|null }
export function resolveAssortmentCandidates(recipeId:string,resultsBySlot:Record<string,AssortmentCatalogItem[]>):{recipe_id:string; slots:AssortmentSlotMatch[]; recommended_ids:string[]; missing_slots:string[]};
export const DEFAULT_COLLECTION_RULES: Readonly<MerchCollectionRules>;
export function normalizeCollectionRules(input?: Partial<MerchCollectionRules>):MerchCollectionRules;
export function matchesCollectionRules(product:Record<string,unknown>,config:Partial<MerchCollectionRules>):boolean;
export function resolveCollectionMembers(products:Array<{id:number;title?:string;slug?:string;collection?:string}>,manualIds:number[],config?:Partial<MerchCollectionRules>):number[];
