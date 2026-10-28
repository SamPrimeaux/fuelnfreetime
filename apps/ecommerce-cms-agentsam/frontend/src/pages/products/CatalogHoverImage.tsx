import { useEffect, useState } from "react";
import ProductImage from "./ProductImage";

/** Blank default, genuine supplier sample only when one exists and loads. */
export default function CatalogHoverImage({sources,sampleUrl,alt}:{
  sources:(string|null|undefined)[];sampleUrl?:string|null;alt?:string;
}){
  const [loaded,setLoaded]=useState(false);
  const [attempted,setAttempted]=useState(false);
  useEffect(()=>{setLoaded(false);setAttempted(false);},[sampleUrl]);
  function preload(){
    if(!sampleUrl||attempted)return;
    setAttempted(true);
    const image=new Image();
    image.onload=()=>setLoaded(true);
    image.onerror=()=>setLoaded(false);
    image.src=sampleUrl;
  }
  return <div className="ps-catalog-hover" onPointerEnter={preload} onFocus={preload}>
    <ProductImage sources={sources.filter((value):value is string=>typeof value==="string"&&value.length>0)} alt={alt||""}/>
    {loaded&&sampleUrl&&<img className="ps-catalog-sample" src={sampleUrl} alt=""
      onError={()=>setLoaded(false)}/>}
    {loaded&&<span className="ps-catalog-sample-label">Supplier sample</span>}
  </div>;
}
