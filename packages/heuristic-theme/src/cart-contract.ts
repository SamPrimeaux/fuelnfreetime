/** Storefront cart contract shared by the preview drawer and checkout. */
export interface CartLine {
  variant_id: number;
  product_id?: number;
  slug?: string;
  title: string;
  color?: string;
  size?: string;
  image?: string;
  price_cents: number;
  qty: number;
}
export interface CartTotals { count: number; subtotal_cents: number; }
export interface CartBridge {
  getCart(): CartLine[];
  setCart(items: CartLine[]): void;
  addItem(item: CartLine): void;
  cartCount(): number;
}
export type CartDrawerAction = "open"|"close"|"inc"|"dec"|"remove";

export interface CartDrawer { open(): void; close(): void; render(): void; isOpen(): boolean; }
declare global {
  interface Window {
    FNF_STORE?: CartBridge;
    FNF_CART_DRAWER?: CartDrawer;
  }
}
