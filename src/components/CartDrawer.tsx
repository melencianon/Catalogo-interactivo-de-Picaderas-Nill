import React, { useState, useMemo, useEffect } from 'react';
import { Product, AppSettings, CartItem, WholesaleCombo, PackagingType, ComboSize, CustomPicaderaRequest, OrderHistoryItem } from '../types';
import { PACKAGING_OPTIONS } from '../data/initialData';
import { formatRD, formatFriendlyQuantity, calculateItemSubtotal, calculateWholesaleItemSubtotal } from '../lib/pricing';
import { generateOrderSerialNumber, getOrderHistory, saveOrderToHistory, removeOrderFromHistory, clearAllOrderHistory } from '../lib/orderHistory';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Store,
  Truck,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Utensils,
  Sparkles,
  ShoppingBag,
  TrendingDown,
  Tag,
  Percent,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  History,
  FileText,
  Search,
  ExternalLink,
  Receipt,
  RotateCcw,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  retailCart: Record<string, { units: number; fillingsBreakdown?: Record<string, number> }>;
  wholesaleCart: Record<string, number>;
  wholesaleCombos: WholesaleCombo[];
  activeMode: 'retail' | 'wholesale';
  onUpdateRetailUnits: (productId: string, units: number) => void;
  onUpdateWholesaleUnits: (productId: string, units: number) => void;
  onRemoveWholesaleCombo: (comboId: string) => void;
  onClearCart: () => void;
  settings: AppSettings;
  selectedPackaging?: PackagingType;
  onChangePackaging?: (type: PackagingType) => void;
  // NUEVOS PROPS PARA IDENTIFICAR COMBO A TU MEDIDA
  selectedSizeId?: string;
  comboLimit?: number | null;
  comboSizes?: ComboSize[];
  // Picaderas personalizadas fuera de catálogo
  customPicaderas?: CustomPicaderaRequest[];
  onRemoveCustomPicadera?: (id: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  products,
  retailCart,
  wholesaleCart,
  wholesaleCombos,
  activeMode,
  onUpdateRetailUnits,
  onUpdateWholesaleUnits,
  onRemoveWholesaleCombo,
  onClearCart,
  settings,
  selectedPackaging = 'bandeja',
  onChangePackaging,
  selectedSizeId,
  comboLimit,
  comboSizes,
  customPicaderas = [],
  onRemoveCustomPicadera,
}) => {
  if (!isOpen) return null;

  // Calculate earliest allowed delivery datetime (current time + 24 hours)
  const getMinDeliveryDateTime = () => {
    const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm
    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDate.getDate()).padStart(2, '0');
    const hours = String(minDate.getHours()).padStart(2, '0');
    const minutes = '00';
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDateTime, setDeliveryDateTime] = useState(getMinDeliveryDateTime());
  const [notes, setNotes] = useState('');
  const [showSavingsTable, setShowSavingsTable] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Drawer View: 'cart' (pedido actual) o 'history' (histórico de pedidos)
  const [activeDrawerView, setActiveDrawerView] = useState<'cart' | 'history'>('cart');

  // Serial Number para la orden en curso
  const [currentSerialNumber, setCurrentSerialNumber] = useState<string>(() => generateOrderSerialNumber());
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Historial de pedidos
  const [orderHistoryList, setOrderHistoryList] = useState<OrderHistoryItem[]>(() => getOrderHistory());
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<OrderHistoryItem | null>(null);

  // Sincronizar historial al abrir el drawer
  useEffect(() => {
    if (isOpen) {
      setOrderHistoryList(getOrderHistory());
    }
  }, [isOpen]);

  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2200);
  };

  const handleRemoveHistoryOrder = (serial: string) => {
    const updated = removeOrderFromHistory(serial);
    setOrderHistoryList(updated);
    if (selectedHistoryOrder?.serialNumber === serial) {
      setSelectedHistoryOrder(null);
    }
  };

  const handleClearHistory = () => {
    clearAllOrderHistory();
    setOrderHistoryList([]);
    setSelectedHistoryOrder(null);
  };

  const handleResendHistoryWhatsApp = (order: OrderHistoryItem) => {
    const waUrl = `https://wa.me/18098733960?text=${encodeURIComponent(order.fullWhatsAppMessage)}`;
    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(waUrl, '_blank');
    }
  };

  // Calculate totals and items
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Retail items list
  const retailItems = Object.entries(retailCart)
    .filter(([_, data]) => data.units > 0)
    .map(([id, data]) => {
      const prod = productMap.get(id);
      if (!prod) return null;
      const { subtotal, isConfirmed } = calculateItemSubtotal(prod, data.units);
      return {
        product: prod,
        units: data.units,
        subtotal,
        isConfirmed,
        fillings: data.fillingsBreakdown,
      };
    })
    .filter(Boolean);

  // Wholesale items list
  const wholesaleItems = Object.entries(wholesaleCart)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const prod = productMap.get(id);
      if (!prod) return null;
      const { subtotal, isConfirmed } = calculateWholesaleItemSubtotal(prod, qty);
      return {
        product: prod,
        units: qty,
        subtotal,
        isConfirmed,
      };
    })
    .filter(Boolean);

  // Wholesale combos total
  const combosTotal = wholesaleCombos.reduce((sum, c) => sum + c.price, 0);

  // Grand totals
  let grandTotal = 0;
  let hasUnconfirmed = false;
  let totalUnitsCount = 0;

  retailItems.forEach((item) => {
    if (item) {
      totalUnitsCount += item.units;
      if (item.subtotal !== null) {
        grandTotal += item.subtotal;
      } else {
        hasUnconfirmed = true;
      }
    }
  });

  wholesaleItems.forEach((item) => {
    if (item) {
      totalUnitsCount += item.units;
      if (item.subtotal !== null) {
        grandTotal += item.subtotal;
      } else {
        hasUnconfirmed = true;
      }
    }
  });

  // Include custom picaderas requested
  const customUnitsCount = (customPicaderas || []).reduce((sum, cp) => sum + cp.units, 0);
  totalUnitsCount += customUnitsCount;
  if (customPicaderas && customPicaderas.length > 0) {
    hasUnconfirmed = true;
  }

  grandTotal += combosTotal;

  // Comparative savings calculation: Individual item price vs combo price
  const savingsComparison = useMemo(() => {
    let totalIndividualPrice = 0;
    let actualPaidPrice = 0;
    const itemBreakdown: Array<{
      name: string;
      units: number;
      individualPrice: number;
      actualPrice: number;
      savings: number;
    }> = [];

    // Retail items calculation
    retailItems.forEach((item) => {
      if (!item || item.subtotal === null) return;
      // Single unit a-la-carte price
      const singleUnitPrice =
        item.product.price_unit !== null
          ? item.product.price_unit
          : item.product.price_dozen !== null
          ? Math.ceil(item.product.price_dozen / 12)
          : 35;

      const individualCost = item.units * singleUnitPrice;
      const actualCost = item.subtotal;
      const diff = Math.max(0, individualCost - actualCost);

      totalIndividualPrice += individualCost;
      actualPaidPrice += actualCost;

      itemBreakdown.push({
        name: item.product.name,
        units: item.units,
        individualPrice: individualCost,
        actualPrice: actualCost,
        savings: diff,
      });
    });

    // Wholesale combos calculation
    wholesaleCombos.forEach((combo) => {
      const estimatedIndividual =
        combo.id === 'combo-mayorista-1'
          ? 5450
          : combo.id === 'combo-mayorista-2'
          ? 7950
          : Math.round(combo.price * 1.2);
      const diff = Math.max(0, estimatedIndividual - combo.price);

      totalIndividualPrice += estimatedIndividual;
      actualPaidPrice += combo.price;

      itemBreakdown.push({
        name: combo.title,
        units: 150,
        individualPrice: estimatedIndividual,
        actualPrice: combo.price,
        savings: diff,
      });
    });

    // Wholesale items calculation
    wholesaleItems.forEach((item) => {
      if (!item || item.subtotal === null) return;
      const retailSinglePrice = item.product.price_unit || 35;
      const individualCost = item.units * retailSinglePrice;
      const actualCost = item.subtotal;
      const diff = Math.max(0, individualCost - actualCost);

      totalIndividualPrice += individualCost;
      actualPaidPrice += actualCost;

      itemBreakdown.push({
        name: `${item.product.name} (Lote)`,
        units: item.units,
        individualPrice: individualCost,
        actualPrice: actualCost,
        savings: diff,
      });
    });

    const totalSavings = Math.max(0, totalIndividualPrice - actualPaidPrice);
    const savingsPercent =
      totalIndividualPrice > 0 ? Math.round((totalSavings / totalIndividualPrice) * 100) : 0;

    return {
      totalIndividualPrice,
      actualPaidPrice,
      totalSavings,
      savingsPercent,
      itemBreakdown,
    };
  }, [retailItems, wholesaleCombos, wholesaleItems]);

  const isCartEmpty =
    retailItems.length === 0 &&
    wholesaleItems.length === 0 &&
    wholesaleCombos.length === 0 &&
    (!customPicaderas || customPicaderas.length === 0);

  // Handle WhatsApp Link Generation
  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setValidationError('Por favor ingresa tu nombre para el pedido.');
      return;
    }

    if (!customerPhone.trim()) {
      setValidationError('Por favor ingresa tu número de WhatsApp para poder contactarte.');
      return;
    }

    if (!deliveryDateTime) {
      setValidationError('Por favor selecciona la fecha y hora de entrega deseada.');
      return;
    }

    // Verify 24h constraint
    const selectedDate = new Date(deliveryDateTime).getTime();
    const minAllowed = Date.now() + 23.5 * 60 * 60 * 1000;
    if (selectedDate < minAllowed) {
      setValidationError('El pedido debe realizarse con un mínimo de 24 horas de anticipación.');
      return;
    }

    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      setValidationError('Por favor indica tu dirección de entrega y sector.');
      return;
    }

    setValidationError('');

    // Format human-readable delivery date
    const formattedDate = new Date(deliveryDateTime).toLocaleString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const serial = currentSerialNumber;
    const nowStr = new Date().toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const isWholesaleOrder = wholesaleItems.length > 0 || wholesaleCombos.length > 0 || activeMode === 'wholesale';
    const packagingObj = PACKAGING_OPTIONS.find((o) => o.id === selectedPackaging);
    const packagingLabel = packagingObj ? packagingObj.name : 'Bandeja de Exhibición para Eventos';

    let comboTypeLabel = '';
    if (selectedSizeId === 'a-tu-medida') {
      comboTypeLabel = `Combo a tu medida: ${comboLimit || totalUnitsCount} unidades`;
    } else if (selectedSizeId && comboSizes) {
      const sizeObj = comboSizes.find((s) => s.id === selectedSizeId);
      if (sizeObj) {
        comboTypeLabel = `${sizeObj.name} (${sizeObj.tag})`;
      }
    }

    // Build visually upgraded WhatsApp message text
    const lines: string[] = [];
    lines.push('══════════════════════════');
    lines.push(isWholesaleOrder ? '📦  *NILL FOOD · PEDIDO MAYORISTA*' : '🥟  *NILL FOOD · COMIDA CRIOLLA*');
    lines.push('📋  *ORDEN OFICIAL DE PICADERAS*');
    lines.push('══════════════════════════');
    lines.push(`🏷️  *NO. DE SERIE:* \`${serial}\``);
    lines.push(`📅  *FECHA DE REGISTRO:* ${nowStr}`);
    lines.push('──────────────────────────');
    lines.push('👤  *DATOS DEL CLIENTE & ENTREGA*');
    lines.push(`• *Cliente:* ${customerName.trim()}`);
    lines.push(`• *Fecha y Hora de Entrega:* ${formattedDate}`);
    lines.push(`• *Modalidad:* ${deliveryMethod === 'delivery' ? '🛵 A Domicilio (Entrega)' : '🏪 Retiro en Tienda'}`);
    if (deliveryMethod === 'delivery') {
      lines.push(`• *Dirección de Entrega:* ${deliveryAddress.trim()}`);
    }
    lines.push(`• *Presentación de Empaque:* 🍱 ${packagingLabel}`);
    if (comboTypeLabel) {
      lines.push(`• *Tipo de Combo:* 🎯 ${comboTypeLabel}`);
    }

    lines.push('──────────────────────────');
    lines.push('🥟  *DESGLOSE DETALLADO DE PICADERAS:*');

    // Retail items con desglose en unidades
    if (retailItems.length > 0) {
      retailItems.forEach((item) => {
        if (!item) return;
        const friendlyQty = formatFriendlyQuantity(item.units);
        const priceStr = item.subtotal !== null ? `RD$ ${item.subtotal.toLocaleString('es-DO')}` : 'Precio por confirmar';
        lines.push('');
        lines.push(`${item.product.emoji || '▫️'} *${item.product.name}*`);
        lines.push(`   ├─ Cantidad: ${item.units} ${item.units === 1 ? 'unidad' : 'unidades'} (${friendlyQty})`);
        if (item.fillings) {
          const fillingsList = Object.entries(item.fillings)
            .filter(([_, count]) => count > 0)
            .map(([f, c]) => `${c} ${f}`)
            .join(', ');
          if (fillingsList) {
            lines.push(`   ├─ Rellenos: ${fillingsList}`);
          }
        }
        lines.push(`   └─ Subtotal: ${priceStr}`);
      });
    }

    // Wholesale combos
    if (wholesaleCombos.length > 0) {
      lines.push('\n🍱 *COMBOS MAYORISTAS ESPECIALES:*');
      wholesaleCombos.forEach((c) => {
        lines.push(`• *${c.title}* ➔ RD$ ${c.price.toLocaleString('es-DO')}`);
      });
    }

    // Wholesale items
    if (wholesaleItems.length > 0) {
      lines.push('\n📦 *LOTES MAYORISTAS (MÍN. 50 UDS):*');
      wholesaleItems.forEach((item) => {
        if (!item) return;
        const priceStr = item.subtotal !== null ? `RD$ ${item.subtotal.toLocaleString('es-DO')}` : 'Precio por confirmar';
        lines.push(`• *${item.product.name}* · ${item.units} uds ➔ ${priceStr}`);
      });
    }

    // Picaderas Especiales Solicitadas (A cotizar)
    if (customPicaderas && customPicaderas.length > 0) {
      lines.push('\n✨ *PICADERAS ESPECIALES FUERA DE MENÚ:*');
      customPicaderas.forEach((cp) => {
        lines.push(`▫️ *${cp.name}*`);
        lines.push(`   ├─ Cantidad solicitada: ${cp.units} ${cp.units === 1 ? 'unidad' : 'unidades'}`);
        if (cp.notes) {
          lines.push(`   ├─ Especificaciones: ${cp.notes}`);
        }
        lines.push(`   └─ Precio: ⏳ A cotizar por el equipo`);
      });
    }

    lines.push('\n══════════════════════════');
    lines.push('💰  *RESUMEN FINANCIERO DEL PEDIDO*');
    lines.push('══════════════════════════');
    lines.push(`• Total de Picaderas: *${totalUnitsCount} unidades*`);
    lines.push(`• Monto Total Estimado: *RD$ ${grandTotal.toLocaleString('es-DO')}*`);
    if (savingsComparison.totalSavings > 0) {
      lines.push(`🎉 *Ahorro con Combo Nill Food:* RD$ ${savingsComparison.totalSavings.toLocaleString('es-DO')} (-${savingsComparison.savingsPercent}% de ahorro vs individual)`);
    }
    if (hasUnconfirmed) {
      lines.push('⚠️ _(Nota: Contiene solicitudes o productos con precio a confirmar por el equipo)_');
    }
    lines.push('══════════════════════════');

    if (isWholesaleOrder) {
      lines.push('\n📌 *Condiciones Mayoristas:*');
      lines.push('• 50% de anticipo para procesar el pedido y 50% contra entrega.');
      lines.push('• Entrega en 24-48 horas laborables.');
    } else {
      lines.push('\n📌 *Condiciones de Pedido:*');
      lines.push('• Se requiere 50% de anticipo para reservar la fecha y horario.');
      lines.push('• Pedidos elaborados frescos para su evento.');
    }

    if (notes.trim()) {
      lines.push(`\n📝 *Notas del Cliente:* ${notes.trim()}`);
    }

    lines.push(`\n💬 _Para confirmar este pedido o realizar tu pago, responde a este mensaje indicando el No. de Serie_ *${serial}*`);
    lines.push('🥘 *Nill Food · Comida Criolla*');
    lines.push('_Sabor auténtico criollo para tus eventos memorables_');

    const cleanPhone = settings.whatsapp_number.replace(/\D/g, '');
    const fullMessage = lines.join('\n');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMessage)}`;

    // Save order record to historical store
    const orderRecord: OrderHistoryItem = {
      serialNumber: serial,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      orderStatus: 'pendiente',
      deliveryDateTime,
      deliveryMethod,
      deliveryAddress: deliveryAddress.trim() || undefined,
      packagingType: selectedPackaging,
      comboTypeLabel: comboTypeLabel || (selectedSizeId ? `Combo ${selectedSizeId}` : 'Pedido Directo'),
      items: retailItems.filter(Boolean).map((it) => ({
        name: it!.product.name,
        units: it!.units,
        subtotal: it!.subtotal,
        fillings: it!.fillings,
      })),
      customPicaderas: customPicaderas && customPicaderas.length > 0 ? customPicaderas : undefined,
      wholesaleCombos: wholesaleCombos.map((wc) => ({ title: wc.title, price: wc.price })),
      wholesaleItems: wholesaleItems.filter(Boolean).map((wi) => ({
        name: wi!.product.name,
        units: wi!.units,
        subtotal: wi!.subtotal,
      })),
      totalUnits: totalUnitsCount,
      grandTotal,
      totalSavings: savingsComparison.totalSavings > 0 ? savingsComparison.totalSavings : undefined,
      savingsPercent: savingsComparison.totalSavings > 0 ? savingsComparison.savingsPercent : undefined,
      hasUnconfirmed,
      notes: notes.trim() || undefined,
      fullWhatsAppMessage: fullMessage,
    };

    saveOrderToHistory(orderRecord);
    setOrderHistoryList(getOrderHistory());

    // Generate fresh serial number for future order
    setCurrentSerialNumber(generateOrderSerialNumber());

    // Safe link open for iframe sandboxes
    try {
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Header */}
        <div className="bg-[#A61B1B] text-white p-4 sm:p-5 flex items-center justify-between sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F2B705] text-[#7A0F0F] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight">
                {activeDrawerView === 'history' ? 'Historial de Pedidos' : 'Resumen de tu Pedido'}
              </h2>
              <span className="text-xs text-amber-200 font-medium">
                {activeDrawerView === 'history'
                  ? `${orderHistoryList.length} pedidos registrados con serie`
                  : `${totalUnitsCount} picaderas en total`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDrawerView === 'cart' && !isCartEmpty && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-xs text-white/80 hover:text-white hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Vaciar carrito"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaciar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              aria-label="Cerrar resumen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs: Current Order vs History */}
        <div className="bg-stone-100 p-1.5 border-b border-stone-200 flex items-center gap-1 sticky top-[72px] z-10">
          <button
            type="button"
            onClick={() => setActiveDrawerView('cart')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeDrawerView === 'cart'
                ? 'bg-white text-[#A61B1B] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Mi Pedido Actual</span>
            {totalUnitsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#A61B1B] text-white">
                {totalUnitsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveDrawerView('history')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeDrawerView === 'history'
                ? 'bg-white text-[#A61B1B] shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico ({orderHistoryList.length})</span>
          </button>
        </div>

        {/* VIEW 1: HISTORICAL ORDERS */}
        {activeDrawerView === 'history' ? (
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            {/* Search and Clear header */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por serie (#NF-...), cliente o picadera..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/20"
                />
              </div>
              {orderHistoryList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-2.5 py-2 rounded-xl text-stone-500 hover:text-red-700 hover:bg-red-50 border border-stone-200 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Borrar todo el historial"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
            </div>

            {/* History Cards */}
            {(() => {
              const term = historySearch.trim().toLowerCase();
              const filtered = orderHistoryList.filter((ord) => {
                if (!term) return true;
                return (
                  ord.serialNumber.toLowerCase().includes(term) ||
                  ord.customerName.toLowerCase().includes(term) ||
                  (ord.deliveryAddress && ord.deliveryAddress.toLowerCase().includes(term)) ||
                  ord.items.some((i) => i.name.toLowerCase().includes(term)) ||
                  (ord.customPicaderas && ord.customPicaderas.some((cp) => (typeof cp === 'string' ? cp : cp.name).toLowerCase().includes(term)))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF3EE] text-[#A61B1B] flex items-center justify-center mx-auto">
                      <History className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-stone-800 text-sm">
                      {orderHistoryList.length === 0
                        ? 'No hay pedidos en el historial aún'
                        : 'No se encontraron pedidos coincidentes'}
                    </h3>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      {orderHistoryList.length === 0
                        ? 'Al enviar un pedido por WhatsApp se le asigna un número de serie único (#NF-...) y queda registrado aquí para reenvíos o consultas.'
                        : 'Prueba buscando con otro término, número de serie o nombre de cliente.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {filtered.map((ord) => {
                    const isViewingMessage = selectedHistoryOrder?.serialNumber === ord.serialNumber;
                    const formattedDate = new Date(ord.createdAt).toLocaleDateString('es-DO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={ord.serialNumber}
                        className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-xs transition-all p-4 space-y-3"
                      >
                        {/* Serial number and Date header */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs sm:text-sm text-[#7A0F0F] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5 text-[#A61B1B]" />
                              #{ord.serialNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySerial(ord.serialNumber)}
                              className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Copiar número de serie"
                            >
                              {copiedSerial === ord.serialNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{formattedDate}</span>
                          </div>
                        </div>

                        {/* Customer & Delivery detail */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                                Cliente
                              </span>
                              {ord.orderStatus && (
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                  ord.orderStatus === 'cotizada'
                                    ? 'bg-blue-100 text-blue-800'
                                    : ord.orderStatus === 'confirmada'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {ord.orderStatus === 'cotizada' ? 'Cotizada' : ord.orderStatus === 'confirmada' ? 'Confirmada' : 'Pendiente'}
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-stone-900 truncate block">
                              {ord.customerName}
                            </span>
                            {ord.customerPhone && (
                              <span className="text-[11px] text-stone-500 block font-normal">
                                📱 {ord.customerPhone}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                              Entrega
                            </span>
                            <span className="font-semibold text-stone-700 truncate block">
                              {ord.deliveryMethod === 'delivery' ? '🚚 Domicilio' : '🏪 Retiro'} · {ord.deliveryDateTime}
                            </span>
                          </div>
                        </div>

                        {/* Packaging and combo */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium">
                            {ord.comboTypeLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200/50">
                            {ord.packagingType === 'bandeja'
                              ? '🍽️ Bandeja'
                              : ord.packagingType === 'caja'
                              ? '📦 Caja Kraft'
                              : '🥡 Individual'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                            {ord.totalUnits} uds totales
                          </span>
                        </div>

                        {/* Items preview pills */}
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {ord.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-stone-50 border border-stone-200/60 text-stone-700 font-medium"
                            >
                              {it.units}× {it.name}
                            </span>
                          ))}
                          {ord.customPicaderas && ord.customPicaderas.map((cp, idx) => (
                            <span
                              key={`cust-${idx}`}
                              className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200/60 text-purple-700 font-semibold"
                            >
                              ✨ {typeof cp === 'string' ? cp : `${cp.units}× ${cp.name}`}
                            </span>
                          ))}
                        </div>

                        {/* Financial summary & savings */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-stone-400">
                              Total Pedido
                            </div>
                            <div className="text-sm font-extrabold text-[#A61B1B]">
                              {formatRD(ord.grandTotal)}
                            </div>
                          </div>
                          {ord.totalSavings && ord.totalSavings > 0 && (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                Ahorro: {formatRD(ord.totalSavings)} ({ord.savingsPercent}%)
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Resend WhatsApp, View Message, Delete */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleResendHistoryWhatsApp(ord)}
                            className="flex-1 py-2 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Reenviar WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedHistoryOrder(isViewingMessage ? null : ord)}
                            className="py-2 px-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                            title="Ver detalle del mensaje WhatsApp"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveHistoryOrder(ord.serialNumber)}
                            className="py-2 px-2.5 rounded-xl border border-stone-200 hover:border-red-200 hover:bg-red-50 text-stone-400 hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                            title="Eliminar del historial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Collapsible raw message view */}
                        {isViewingMessage && (
                          <div className="mt-2 p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-stone-800 select-all">
                            {ord.fullWhatsAppMessage}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* VIEW 2: CURRENT CART CONTENT AREA */
          <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
            {isCartEmpty ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#FFF3EE] text-[#A61B1B] flex items-center justify-center mx-auto">
                  <Utensils className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-stone-800 text-base">
                  Tu combo aún está vacío
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Explora el catálogo y agrega tus picaderas favoritas usando los botones + y el selector de unidades.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 bg-[#A61B1B] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#8e1515] transition-colors cursor-pointer"
                >
                  Comenzar a Armar Combo
                </button>
              </div>
            ) : (
              <>
                {/* Serial Number Ticket Banner */}
                <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border border-amber-300/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#A61B1B] text-[#F2B705] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                        No. de Serie Asignado
                      </div>
                      <div className="text-sm font-black font-mono text-[#7A0F0F] tracking-wide">
                        #{currentSerialNumber}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopySerial(currentSerialNumber)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-[#A61B1B] hover:border-[#A61B1B] text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Copiar número de serie"
                  >
                    {copiedSerial === currentSerialNumber ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Picaderas Seleccionadas
                    </h3>
                    {selectedSizeId === 'a-tu-medida' && (
                      <span className="text-[11px] font-extrabold text-[#7A0F0F] bg-[#FFF3EE] border border-[#A61B1B]/30 px-2.5 py-0.5 rounded-full shadow-2xs">
                        🎯 Combo a tu medida: {comboLimit || totalUnitsCount} uds
                      </span>
                    )}
                  </div>

                {/* Wholesale Combos */}
                {wholesaleCombos.map((wc) => (
                  <div
                    key={wc.id}
                    className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold bg-[#1F4E4F] text-white px-2 py-0.5 rounded-md">
                        Combo Mayorista
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm mt-1">
                        {wc.title}
                      </h4>
                      <span className="text-xs font-bold text-[#1F4E4F] block mt-0.5">
                        {formatRD(wc.price)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveWholesaleCombo(wc.id)}
                      className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Retail Items */}
                {retailItems.map((item) => {
                  if (!item) return null;
                  const fillingsText = item.fillings
                    ? Object.entries(item.fillings)
                        .filter(([_, c]) => c > 0)
                        .map(([f, c]) => `${c} ${f}`)
                        .join(', ')
                    : '';

                  return (
                    <div
                      key={item.product.id}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.product.emoji}</span>
                          <div>
                            <h4 className="font-bold text-stone-900 text-sm leading-tight">
                              {item.product.name}
                            </h4>
                            <span className="text-xs text-stone-600 font-medium">
                              {item.units} uds ·{' '}
                              <strong className="text-[#A61B1B]">
                                {formatFriendlyQuantity(item.units)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {fillingsText && (
                          <div className="mt-1.5 ml-7 text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block">
                            Rellenos: {fillingsText}
                          </div>
                        )}

                        <div className="mt-2 ml-7 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateRetailUnits(item.product.id, Math.max(0, item.units - 1))}
                            className="w-6 h-6 rounded-md bg-white border border-stone-200 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold tabular-nums">
                            {item.units}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateRetailUnits(item.product.id, item.units + 1)}
                            className="w-6 h-6 rounded-md bg-[#A61B1B] text-white text-xs font-bold hover:bg-[#8e1515] flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-stone-900 text-sm block">
                          {formatRD(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateRetailUnits(item.product.id, 0)}
                          className="text-stone-400 hover:text-red-600 mt-2 p-1 text-xs cursor-pointer inline-flex items-center"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Custom Picaderas Requested Outside Catalog */}
                {customPicaderas && customPicaderas.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-amber-200/70">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Picaderas Especiales Solicitadas (A cotizar)</span>
                    </div>

                    {customPicaderas.map((cp) => (
                      <div
                        key={cp.id}
                        className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">✨</span>
                            <div>
                              <h4 className="font-bold text-stone-900 text-sm leading-tight">
                                {cp.name}
                              </h4>
                              <span className="text-xs text-amber-900 font-semibold">
                                {cp.units} {cp.units === 1 ? 'unidad' : 'unidades'}
                              </span>
                            </div>
                          </div>

                          {cp.notes && (
                            <div className="mt-1.5 ml-7 text-[11px] text-stone-600 bg-white/90 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block">
                              Nota: {cp.notes}
                            </div>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md block">
                            Por cotizar
                          </span>
                          {onRemoveCustomPicadera && (
                            <button
                              type="button"
                              onClick={() => onRemoveCustomPicadera(cp.id)}
                              className="text-stone-400 hover:text-red-600 mt-2 p-1 text-xs cursor-pointer inline-flex items-center"
                              title="Eliminar solicitud especial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Wholesale Items */}
                {wholesaleItems.map((item) => {
                  if (!item) return null;
                  return (
                    <div
                      key={item.product.id}
                      className="p-3.5 rounded-2xl bg-teal-50/40 border border-teal-200 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-[#1F4E4F] uppercase">
                          Mayorista (Min. 50 uds)
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm leading-tight">
                          {item.product.name}
                        </h4>
                        <span className="text-xs text-stone-600 font-medium">
                          {item.units} unidades
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#1F4E4F] text-sm block">
                          {formatRD(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateWholesaleUnits(item.product.id, 0)}
                          className="text-stone-400 hover:text-red-600 mt-2 p-1 text-xs cursor-pointer inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Comparative Savings Table: Pre-assembled Combo vs Individual Price */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 leading-tight">
                        Ahorro del Combo vs. Precio Suelto
                      </h4>
                      <p className="text-[10px] text-emerald-700">
                        Comparativa de pedir en combo vs comprar las mismas picaderas individuales
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {savingsComparison.totalSavings > 0 && (
                      <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                        -{savingsComparison.savingsPercent}% OFF
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSavingsTable(!showSavingsTable)}
                      className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-800 text-xs font-medium cursor-pointer"
                      title={showSavingsTable ? 'Ocultar tabla' : 'Ver tabla'}
                    >
                      {showSavingsTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {showSavingsTable && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="overflow-x-auto rounded-xl border border-emerald-200 bg-white">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-emerald-100/70 text-emerald-950 font-bold border-b border-emerald-200">
                          <tr>
                            <th className="py-2 px-2.5">Picadera / Combo</th>
                            <th className="py-2 px-1 text-center">Cant.</th>
                            <th className="py-2 px-2 text-right text-stone-500">Precio Suelto</th>
                            <th className="py-2 px-2 text-right text-emerald-950">En Combo</th>
                            <th className="py-2 px-2.5 text-right text-emerald-700">Ahorro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100">
                          {savingsComparison.itemBreakdown.length > 0 ? (
                            savingsComparison.itemBreakdown.map((row, idx) => (
                              <tr key={idx} className="hover:bg-emerald-50/50">
                                <td className="py-1.5 px-2.5 font-medium text-stone-800 truncate max-w-[130px]">
                                  {row.name}
                                </td>
                                <td className="py-1.5 px-1 text-center text-stone-600">
                                  {row.units}
                                </td>
                                <td className="py-1.5 px-2 text-right text-stone-400 line-through">
                                  RD$ {row.individualPrice.toLocaleString('es-DO')}
                                </td>
                                <td className="py-1.5 px-2 text-right font-bold text-stone-900">
                                  RD$ {row.actualPrice.toLocaleString('es-DO')}
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-bold text-emerald-700">
                                  {row.savings > 0 ? `+ RD$ ${row.savings.toLocaleString('es-DO')}` : 'Tarifa base'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-3 px-3 text-center text-stone-400 italic">
                                Agrega picaderas para ver el ahorro comparativo
                              </td>
                            </tr>
                          )}

                          {/* Reference Row: Combo Compartido Especial */}
                          <tr className="bg-amber-50/60 font-semibold border-t border-amber-200">
                            <td className="py-2 px-2.5 text-amber-950">
                              <span className="text-[#A61B1B]">★ Ref: Combo Compartido</span>
                            </td>
                            <td className="py-2 px-1 text-center text-amber-900">24 uds</td>
                            <td className="py-2 px-2 text-right text-stone-400 line-through">RD$ 840</td>
                            <td className="py-2 px-2 text-right font-bold text-[#7A0F0F]">
                              RD$ {settings.special_combo_price.toLocaleString('es-DO')}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                              + RD$ {(840 - settings.special_combo_price).toLocaleString('es-DO')}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-emerald-100/90 font-extrabold text-emerald-950 border-t border-emerald-200">
                          <tr>
                            <td colSpan={2} className="py-2 px-2.5">
                              Total de tu Pedido:
                            </td>
                            <td className="py-2 px-2 text-right text-stone-500 line-through">
                              RD$ {savingsComparison.totalIndividualPrice.toLocaleString('es-DO')}
                            </td>
                            <td className="py-2 px-2 text-right text-emerald-950">
                              RD$ {savingsComparison.actualPaidPrice.toLocaleString('es-DO')}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-800 font-black">
                              RD$ {savingsComparison.totalSavings.toLocaleString('es-DO')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-emerald-800 px-1">
                      <span>💡 <strong>Ventaja Combo:</strong> Ahorras hasta 25% frente a unidades sueltas.</span>
                      {savingsComparison.totalSavings > 0 && (
                        <span className="font-bold text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded-md">
                          ¡Tu ahorro total: RD$ {savingsComparison.totalSavings.toLocaleString('es-DO')}!
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Summary Box */}
              <div className="bg-[#FFF3EE] rounded-2xl p-4 border border-[#A61B1B]/20 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-600">Total unidades:</span>
                  <span className="font-bold text-stone-900">{totalUnitsCount} picaderas</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#A61B1B]/15">
                  <span className="font-bold text-stone-900 text-base">Total a Pagar:</span>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#7A0F0F]">
                      {formatRD(grandTotal)}
                    </span>
                    {hasUnconfirmed && (
                      <span className="block text-[11px] text-amber-800 font-semibold">
                        + Productos por confirmar
                      </span>
                    )}
                  </div>
                </div>
                {hasUnconfirmed && (
                  <p className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-xl mt-1 leading-normal">
                    💡 Algunas salsas o picaderas seleccionadas se cotizan al momento según el tamaño del envase o ingredientes.
                  </p>
                )}
              </div>

              {/* Order Form */}
              <form onSubmit={handleSendWhatsApp} className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Datos de Entrega para WhatsApp
                </h3>

                {/* Validation Alert */}
                {validationError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tu Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carmen Rosario"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30 focus:border-[#A61B1B]"
                  />
                </div>

                {/* Customer Phone (WhatsApp) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tu número de WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 809-555-0123"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30 focus:border-[#A61B1B]"
                  />
                  <span className="text-[11px] text-stone-500 block mt-1">
                    Te responderemos por este número para cotizar o confirmar tu orden.
                  </span>
                </div>

                {/* Delivery Date & Time (Min 24h) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#A61B1B]" />
                      <span>Fecha y Hora Requerida *</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#A61B1B] bg-red-50 px-2 py-0.5 rounded-md">
                      Mínimo 24h anticipación
                    </span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    min={getMinDeliveryDateTime()}
                    value={deliveryDateTime}
                    onChange={(e) => setDeliveryDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30 focus:border-[#A61B1B]"
                  />
                  <span className="text-[11px] text-stone-500 block mt-1">
                    Horario de entrega: Lunes a Domingo de 8:00 AM a 8:00 PM.
                  </span>
                </div>

                {/* Delivery vs Pickup Selector */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Modalidad de Recibimiento *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        deliveryMethod === 'delivery'
                          ? 'border-[#A61B1B] bg-[#FFF3EE] text-[#7A0F0F] font-bold ring-1 ring-[#A61B1B]/20'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-[#A61B1B] shrink-0" />
                      <div>
                        <span className="text-xs block leading-tight">A Domicilio</span>
                        <span className="text-[10px] text-stone-500 font-normal">Envío con chofer</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        deliveryMethod === 'pickup'
                          ? 'border-[#A61B1B] bg-[#FFF3EE] text-[#7A0F0F] font-bold ring-1 ring-[#A61B1B]/20'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Store className="w-4 h-4 text-[#A61B1B] shrink-0" />
                      <div>
                        <span className="text-xs block leading-tight">Retiro en Tienda</span>
                        <span className="text-[10px] text-stone-500 font-normal">Bajos de Haina</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Packaging Presentation Option */}
                {onChangePackaging && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Presentación / Tipo de Empaque *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PACKAGING_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangePackaging(opt.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedPackaging === opt.id
                              ? 'border-[#A61B1B] bg-[#FFF3EE] text-[#7A0F0F] font-bold ring-1 ring-[#A61B1B]/20'
                              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-base block mb-0.5">
                            {opt.id === 'bandeja' ? '🍽️' : opt.id === 'caja' ? '📦' : '🥡'}
                          </span>
                          <span className="text-[11px] block leading-tight font-bold">
                            {opt.id === 'bandeja' ? 'Bandeja' : opt.id === 'caja' ? 'Caja Kraft' : 'Individual'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Address if delivery */}
                {deliveryMethod === 'delivery' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Dirección Completa & Sector *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Calle, número de casa/apto, sector y punto de referencia..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30 focus:border-[#A61B1B]"
                    />
                  </div>
                )}

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Instrucciones Especiales (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Empacar salsas por separado, servir bien calientes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30"
                  />
                </div>

                {/* Primary WhatsApp Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Pedir por WhatsApp (Serie #{currentSerialNumber})</span>
                  </button>
                  <p className="text-[11px] text-center text-stone-500 mt-2">
                    Tu pedido se enviará al WhatsApp 1809-873-3960 y quedará registrado en tu historial con la serie #{currentSerialNumber}.
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
