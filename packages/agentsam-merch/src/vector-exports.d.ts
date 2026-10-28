export type VectorPlan = {widthPx:number;heightPx:number;sourceKind:"vector"|"raster";targetPpi:number;effectivePpi:number;sourceHasRequiredDetail:boolean;note:string};
export declare const MAX_EXPORT_SIDE:number;export declare const MAX_EXPORT_PIXELS:number;
export declare function planVectorExport(args:{widthIn:number;heightIn:number;dpi?:number;intrinsicWidth?:number;intrinsicHeight?:number;isVector?:boolean}):VectorPlan;
export declare function inspectPrintMethodArtwork(args:{method:string;colorCount:number;transparent:boolean;hasLiveText?:boolean}):{method:string;warnings:string[];reviewRequired:boolean};
