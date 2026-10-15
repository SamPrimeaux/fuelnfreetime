// @ts-check
/** @typedef {import("../../src/cart-contract.js").CartLine} CartLine */
/** @param {CartLine[]} items */
export function cartTotals(items) {
  return items.reduce((totals, item) => {
    const qty = Number.isInteger(item.qty) ? Math.min(10, Math.max(1, item.qty)) : 1;
    totals.count += qty;
    totals.subtotal_cents += Math.max(0, Number(item.price_cents) || 0) * qty;
    return totals;
  }, {count:0,subtotal_cents:0});
}
/** @param {CartLine[]} items @param {number} index @param {"inc"|"dec"|"remove"} action */
export function changeCartLine(items, index, action) {
  if(!Number.isInteger(index) || index<0 || index>=items.length)return items;
  const copy = items.map(item=>({...item}));
  if(action==="remove"){copy.splice(index,1);return copy;}
  const item=copy[index];
  if(action==="inc")item.qty=Math.min(10,item.qty+1);
  if(action==="dec"){if(item.qty>1)item.qty-=1;else copy.splice(index,1);}
  return copy;
}
/** @param {CartLine} item */
export function cartLineLabel(item) {
  return [item.color,item.size ? "Size "+item.size:null].filter(Boolean).join(" · ");
}
