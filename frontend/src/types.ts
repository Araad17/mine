export type Unit = 'ton' | 'kg';
export interface Shipment {
  id: number; ship_date: string; material_id: number; material: string;
  receiver_id: number; receiver_name: string; unit: Unit; unit_price: number;
  total_quantity: number; total_amount: number; paid: number; remaining: number;
  truck_count: number; notes?: string | null;
}
export interface Truck { driver_name: string; plate_number: string; load_amount: number }
export interface Payment { id: number; amount: number; paid_at: string; note?: string | null }
export interface ShipmentDetail extends Shipment { trucks: Truck[]; payments: Payment[] }
export interface Receiver { id: number; name: string; phone?: string | null; address?: string | null }
export interface Material { id: number; name: string }
export interface User { id: number; name: string; email: string; role: 'super_admin' | 'admin'; is_active: boolean }
export interface Statement {
  receiver: Receiver; from: string | null; to: string | null; shipments: Shipment[];
  ledger: { id: string; shipment_id: number; date: string; type: 'shipment' | 'payment'; amount: number; balance: number; note?: string | null }[];
  totals: { shipments: number; trucks: number; tons: number; kg: number; total_in_tons: number; total_amount: number; paid: number; remaining: number };
}
