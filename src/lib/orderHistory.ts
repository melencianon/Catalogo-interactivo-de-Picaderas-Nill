import { OrderHistoryItem } from '../types';

const STORAGE_KEY_ORDERS_HISTORY = 'nill_food_orders_history_v1';

/**
 * Generates a memorable, unique serial number for the order.
 * Format: NF-YYMMDD-XXXX (e.g. NF-261109-8472)
 */
export function generateOrderSerialNumber(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `NF-${year}${month}${day}-${randomSuffix}`;
}

const INITIAL_DEMO_ORDER: OrderHistoryItem = {
  serialNumber: 'NF-261110-8420',
  createdAt: new Date().toISOString(),
  customerName: 'Rosanna Almonte',
  customerPhone: '809-555-4321',
  orderStatus: 'pendiente',
  deliveryDateTime: '2026-11-15T16:00',
  deliveryMethod: 'delivery',
  deliveryAddress: 'Av. Anacaona No. 45, Bella Vista, Santo Domingo',
  packagingType: 'caja',
  comboTypeLabel: 'Combo Personalizado Evento',
  items: [
    { name: 'Quipes Tradicionales', units: 24, subtotal: 960 },
    { name: 'Croquetas de Pollo Criollo', units: 24, subtotal: 840 },
    { name: 'Pastelitos de Res', units: 24, subtotal: 960 },
  ],
  customPicaderas: [
    { id: 'cp-demo-1', name: 'Mini Empanaditas de Chivo Liniero', units: 30, notes: 'Bien crujientes para evento privado' },
    { id: 'cp-demo-2', name: 'Bollitos de Yuca Rellenos de Cangrejo', units: 25, notes: 'Con salsa tártara aparte' },
  ],
  totalUnits: 127,
  grandTotal: 2760,
  hasUnconfirmed: true,
  notes: 'Favor cotizar las picaderas personalizadas fuera de menú.',
  fullWhatsAppMessage: 'Orden oficial para cotización de picaderas...',
};

/**
 * Retrieve list of orders from local storage, sorted newest first
 */
export function getOrderHistory(): OrderHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS_HISTORY);
    if (!raw) {
      return [INITIAL_DEMO_ORDER];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 ? parsed : [INITIAL_DEMO_ORDER];
    }
    return [INITIAL_DEMO_ORDER];
  } catch (e) {
    console.error('Error reading order history:', e);
    return [INITIAL_DEMO_ORDER];
  }
}

/**
 * Save a new order to the history list
 */
export function saveOrderToHistory(order: OrderHistoryItem): void {
  try {
    const current = getOrderHistory();
    // Prepend new order, avoiding duplicates
    const filtered = current.filter((o) => o.serialNumber !== order.serialNumber);
    const updated = [order, ...filtered];
    localStorage.setItem(STORAGE_KEY_ORDERS_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving order to history:', e);
  }
}

/**
 * Remove an order from history by serial number
 */
export function removeOrderFromHistory(serialNumber: string): OrderHistoryItem[] {
  try {
    const current = getOrderHistory();
    const updated = current.filter((o) => o.serialNumber !== serialNumber);
    localStorage.setItem(STORAGE_KEY_ORDERS_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error removing order from history:', e);
    return [];
  }
}

/**
 * Update an existing order in history (e.g. status or price change)
 */
export function updateOrderInHistory(order: OrderHistoryItem): OrderHistoryItem[] {
  try {
    const current = getOrderHistory();
    const updated = current.map((o) => (o.serialNumber === order.serialNumber ? order : o));
    localStorage.setItem(STORAGE_KEY_ORDERS_HISTORY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating order in history:', e);
    return getOrderHistory();
  }
}

/**
 * Clear all order history
 */
export function clearAllOrderHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_ORDERS_HISTORY);
  } catch (e) {
    console.error('Error clearing order history:', e);
  }
}
