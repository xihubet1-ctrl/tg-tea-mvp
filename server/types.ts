export type OrderItem = {
  itemId: string; name: string; qty: number;
  unitPrice: number; price: number;
  size?: string; sugar?: string; ice?: string;
  addons?: { id:string; name:string; price:number }[];
};

export type Order = {
  id: string;
  userId: number;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  addressText: string;
  addressContact?: string;
  addressPhone?: string;
  lat?: number; lon?: number;
  note?: string;
  payMethod: 'cash'|'huiwang';
  status: 'pending'|'confirmed'|'preparing'|'delivering'|'done'|'canceled';
  createdAt: number;
};
