import { Product, CartItem } from '../types';

/**
 * Format Dominican Pesos: e.g. RD$ 420
 */
export function formatRD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Precio por confirmar';
  }
  return `RD$ ${amount.toLocaleString('es-DO')}`;
}

/**
 * Friendly breakdown of units into Dozens, Half-Dozens and Singles.
 * e.g. 15 -> "1 docena + 3 unidades"
 *      18 -> "1 docena + ½ docena"
 *      24 -> "2 docenas"
 *      6  -> "½ docena"
 */
export function formatFriendlyQuantity(units: number): string {
  if (units <= 0) return '0 unidades';
  if (units === 1) return '1 unidad';

  const dozens = Math.floor(units / 12);
  const remainder = units % 12;
  const halfDozens = Math.floor(remainder / 6);
  const singles = remainder % 6;

  const parts: string[] = [];

  if (dozens > 0) {
    parts.push(dozens === 1 ? '1 docena' : `${dozens} docenas`);
  }

  if (halfDozens > 0) {
    parts.push('½ docena');
  }

  if (singles > 0) {
    parts.push(singles === 1 ? '1 unidad' : `${singles} unidades`);
  }

  if (parts.length === 0) return `${units} unidades`;
  return parts.join(' + ');
}

/**
 * Computes prices for a product according to its mode ('auto' or 'manual')
 */
export function computeEffectivePrices(product: Product): {
  unit: number | null;
  half: number | null;
  dozen: number | null;
} {
  if (product.price_mode === 'manual') {
    return {
      unit: product.price_unit,
      half: product.price_half,
      dozen: product.price_dozen,
    };
  }

  // Automatic calculation from dozen
  if (product.price_dozen !== null) {
    const dozen = product.price_dozen;
    const half = product.price_half !== null ? product.price_half : Math.round(dozen / 2);
    const unit = product.price_unit !== null ? product.price_unit : Math.round(dozen / 12);
    return { unit, half, dozen };
  }

  // If dozen is null but unit is provided (e.g. Fru Fru RD$100)
  if (product.price_unit !== null) {
    const unit = product.price_unit;
    const half = unit * 6;
    const dozen = unit * 12;
    return { unit, half, dozen };
  }

  return { unit: null, half: null, dozen: null };
}

/**
 * Calculate best-price subtotal for standard customer cart item
 */
export function calculateItemSubtotal(product: Product, units: number): {
  subtotal: number | null;
  isConfirmed: boolean;
  breakdownText: string;
} {
  const { unit: pUnit, half: pHalf, dozen: pDozen } = computeEffectivePrices(product);

  // If no prices are defined
  if (pDozen === null && pHalf === null && pUnit === null) {
    return {
      subtotal: null,
      isConfirmed: false,
      breakdownText: `${formatFriendlyQuantity(units)} (Precio por confirmar)`,
    };
  }

  const effectiveUnit = pUnit ?? (pDozen ? pDozen / 12 : 0);
  const effectiveHalf = pHalf ?? (pDozen ? pDozen / 2 : effectiveUnit * 6);
  const effectiveDozen = pDozen ?? (effectiveHalf ? effectiveHalf * 2 : effectiveUnit * 12);

  const dozens = Math.floor(units / 12);
  const remainder = units % 12;
  const halfDozens = Math.floor(remainder / 6);
  const singles = remainder % 6;

  const cost =
    dozens * effectiveDozen +
    halfDozens * effectiveHalf +
    singles * effectiveUnit;

  return {
    subtotal: Math.round(cost),
    isConfirmed: true,
    breakdownText: formatFriendlyQuantity(units),
  };
}

/**
 * Calculate wholesale subtotal for business orders (min 50 units)
 */
export function calculateWholesaleItemSubtotal(product: Product, units: number): {
  subtotal: number | null;
  isConfirmed: boolean;
  breakdownText: string;
} {
  const batchPrice = product.wholesale_batch_price; // Price for 50 units
  const unitPrice = product.wholesale_unit_price;

  if (batchPrice === null && unitPrice === null) {
    return {
      subtotal: null,
      isConfirmed: false,
      breakdownText: `${units} unidades (Precio mayorista por confirmar)`,
    };
  }

  const batches = Math.floor(units / 50);
  const looseUnits = units % 50;

  let total = 0;
  if (batchPrice !== null) {
    total += batches * batchPrice;
    if (unitPrice !== null) {
      total += looseUnits * unitPrice;
    } else {
      total += looseUnits * (batchPrice / 50);
    }
  } else if (unitPrice !== null) {
    total += units * unitPrice;
  }

  const desc = batches > 0
    ? `${batches} lote(s) de 50${looseUnits > 0 ? ` + ${looseUnits} uds sueltas` : ''}`
    : `${units} unidades`;

  return {
    subtotal: Math.round(total),
    isConfirmed: true,
    breakdownText: desc,
  };
}
