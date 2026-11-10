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

/**
 * Retrieve list of orders from local storage, sorted newest first
 */
export function getOrderHistory(): OrderHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error reading order history:', e);
    return [];
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
