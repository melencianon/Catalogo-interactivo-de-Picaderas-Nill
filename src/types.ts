export type SalesModality = 'todas' | 'solo_unidad' | 'solo_docena';
export type PriceMode = 'auto' | 'manual';
export type UnitStep = 1 | 6 | 12; // 1 = Unidad, 6 = Media docena, 12 = Docena

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  image_url: string | null;
  // Prices in RD$ (null = 'Precio por confirmar')
  price_dozen: number | null;
  price_half: number | null;
  price_unit: number | null;
  price_mode: PriceMode;
  sales_modality: SalesModality;
  available: boolean;
  fillings: string[]; // Options if applicable
  // Wholesale pricing (Min 50 units)
  wholesale_unit_price: number | null;
  wholesale_batch_price: number | null; // Price for 50 units
}

export interface CartItem {
  productId: string;
  units: number; // Stored in total units
  fillingsBreakdown?: Record<string, number>; // e.g. { 'Pollo': 3, 'Queso': 3 }
  isWholesale?: boolean;
}

export interface WholesaleCombo {
  id: string;
  title: string;
  badge: string;
  description: string;
  itemsList: string[];
  price: number;
}

export interface ComboSize {
  id: string;
  name: string;
  units: number | null; // null = Libre (sin límite)
  tag: string;
  recommendedFor: string;
}

export interface AppSettings {
  brand_name: string;
  brand_slogan: string;
  brand_tagline: string;
  instagram: string;
  whatsapp_number: string;
  whatsapp_welcome: string;
  address: string;
  email: string;
  logo_url: string | null;
  special_combo_price: number; // RD$ 750
  wholesale_min_units: number; // 50
  supabase_url?: string;
  supabase_anon_key?: string;
  // Configuración de la tarjeta "A tu medida"
  custom_combo_enabled?: boolean;
  custom_combo_name?: string;
  custom_combo_tag?: string;
  custom_combo_description?: string;
  custom_combo_min?: number;
  custom_combo_max?: number;
}

export type PackagingType = 'bandeja' | 'caja' | 'individual';

export interface PackagingOption {
  id: PackagingType;
  name: string;
  badge: string;
  subtitle: string;
  description: string;
  image_url: string;
  bestFor: string;
}

export interface CustomPicaderaRequest {
  id: string;
  name: string;
  units: number;
  notes?: string;
}

export interface OrderHistoryItem {
  serialNumber: string; // e.g. NF-261109-8472
  createdAt: string; // ISO string
  customerName: string;
  customerPhone: string;
  orderStatus?: 'pendiente' | 'cotizada' | 'confirmada';
  deliveryDateTime: string;
  deliveryMethod: 'delivery' | 'pickup';
  deliveryAddress?: string;
  packagingType: PackagingType;
  comboTypeLabel: string;
  items: Array<{
    name: string;
    units: number;
    subtotal: number | null;
    fillings?: Record<string, number>;
  }>;
  customPicaderas?: CustomPicaderaRequest[];
  wholesaleCombos?: Array<{ title: string; price: number }>;
  wholesaleItems?: Array<{ name: string; units: number; subtotal: number | null }>;
  totalUnits: number;
  grandTotal: number;
  totalSavings?: number;
  savingsPercent?: number;
  hasUnconfirmed: boolean;
  notes?: string;
  fullWhatsAppMessage: string;
}



