import React, { useState, useEffect, useMemo } from 'react';
import { Product, AppSettings, ComboSize, WholesaleCombo, PackagingType, CustomPicaderaRequest } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_CATEGORIES,
  INITIAL_COMBO_SIZES,
  SPECIAL_COMBO_ITEMS,
} from './data/initialData';
import { loadCatalogFromCloud, syncCatalogToCloud, clearDeletedProductsRecord } from './lib/supabase';
import { calculateItemSubtotal, calculateWholesaleItemSubtotal, formatRD } from './lib/pricing';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ComboSizeSelector } from './components/ComboSizeSelector';
import { PackagingSimulator } from './components/PackagingSimulator';
import { ProductCard } from './components/ProductCard';
import { FillingsModal } from './components/FillingsModal';
import { WholesaleView } from './components/WholesaleView';
import { StickyBottomBar } from './components/StickyBottomBar';
import { CartDrawer } from './components/CartDrawer';
import { AdminModal } from './components/AdminModal';
import { Footer } from './components/Footer';
import { Search, Sparkles, Filter, AlertCircle, ShoppingBag, RotateCcw, ArrowRight, ArrowLeft, Check, Layers, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function App() {
  // App Catalog & Config State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [comboSizes, setComboSizes] = useState<ComboSize[]>(INITIAL_COMBO_SIZES);

  // Cloud Status
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // UI Modes & Filters
  const [activeMode, setActiveMode] = useState<'retail' | 'wholesale'>('retail');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('mediano');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Retail Step Wizard: 'size' | 'picaderas' | 'custom_picadera' | 'packaging'
  const [retailStep, setRetailStep] = useState<'size' | 'picaderas' | 'custom_picadera' | 'packaging'>('size');
  const [refreshToast, setRefreshToast] = useState<string>('');

  // NUEVO: Estado de unidades para la tarjeta "A tu medida" (por defecto 12)
  const [customComboUnits, setCustomComboUnits] = useState<number>(12);

  // Cart State (stored in units)
  const [retailCart, setRetailCart] = useState<
    Record<string, { units: number; fillingsBreakdown?: Record<string, number> }>
  >({});
  const [wholesaleCart, setWholesaleCart] = useState<Record<string, number>>({});
  const [wholesaleCombos, setWholesaleCombos] = useState<WholesaleCombo[]>([]);

  // Picaderas personalizadas fuera de catálogo (Paso 3)
  const [customPicaderas, setCustomPicaderas] = useState<CustomPicaderaRequest[]>([]);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomUnits, setNewCustomUnits] = useState<number>(12);
  const [newCustomNotes, setNewCustomNotes] = useState<string>('');
  const [customPicaderaToast, setCustomPicaderaToast] = useState<string>('');

  // Packaging selection (bandeja, caja, individual)
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingType>('bandeja');

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [fillingsProduct, setFillingsProduct] = useState<Product | null>(null);

  // Load catalog on initial mount
  const refreshCatalog = async () => {
    try {
      const data = await loadCatalogFromCloud();
      setProducts(data.products);
      setSettings(data.settings);
      setCategories(data.categories);
      setComboSizes(data.comboSizes);
      setIsOnline(data.isOnline);
      if (data.statusMessage) setStatusMsg(data.statusMessage);
    } catch (e) {
      console.warn('Error loading catalog:', e);
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, []);

  // Current combo size limit in units (soporta tamaños predefinidos y tarjeta "A tu medida")
  const isCustomCombo = selectedSizeId === 'a-tu-medida';
  const currentComboSize = isCustomCombo
    ? {
        id: 'a-tu-medida',
        name: settings.custom_combo_name || 'A tu medida',
        units: customComboUnits,
        tag: `${customComboUnits} uds`,
        recommendedFor: settings.custom_combo_description || 'Personaliza la cantidad exacta',
      }
    : comboSizes.find((s) => s.id === selectedSizeId) || comboSizes[0];

  const comboUnitLimit = isCustomCombo ? customComboUnits : (currentComboSize?.units ?? null);

  // Calculate total units in retail combo
  const totalRetailUnits = useMemo(() => {
    return Object.values(retailCart).reduce((sum, item) => sum + (item.units || 0), 0);
  }, [retailCart]);

  // Calculate retail total RD$
  const { retailTotal, hasUnconfirmedRetail } = useMemo(() => {
    let sum = 0;
    let unconfirmed = false;
    const pMap = new Map(products.map((p) => [p.id, p]));

    Object.entries(retailCart).forEach(([id, data]) => {
      if (data.units > 0) {
        const prod = pMap.get(id);
        if (prod) {
          const { subtotal } = calculateItemSubtotal(prod, data.units);
          if (subtotal !== null) {
            sum += subtotal;
          } else {
            unconfirmed = true;
          }
        }
      }
    });

    return { retailTotal: sum, hasUnconfirmedRetail: unconfirmed };
  }, [retailCart, products]);

  // Calculate wholesale total RD$ and units
  const { wholesaleTotal, totalWholesaleUnits, hasUnconfirmedWholesale } = useMemo(() => {
    let sum = 0;
    let unitsCount = 0;
    let unconfirmed = false;
    const pMap = new Map(products.map((p) => [p.id, p]));

    Object.entries(wholesaleCart).forEach(([id, qty]) => {
      if (qty > 0) {
        unitsCount += qty;
        const prod = pMap.get(id);
        if (prod) {
          const { subtotal } = calculateWholesaleItemSubtotal(prod, qty);
          if (subtotal !== null) {
            sum += subtotal;
          } else {
            unconfirmed = true;
          }
        }
      }
    });

    // Add wholesale combos
    wholesaleCombos.forEach((c) => {
      sum += c.price;
    });

    return {
      wholesaleTotal: sum,
      totalWholesaleUnits: unitsCount,
      hasUnconfirmedWholesale: unconfirmed,
    };
  }, [wholesaleCart, wholesaleCombos, products]);

  // Calculate custom picaderas requested outside menu
  const totalCustomUnits = useMemo(() => {
    return customPicaderas.reduce((sum, c) => sum + c.units, 0);
  }, [customPicaderas]);

  // Display totals based on active mode
  const displayedUnits = activeMode === 'retail' ? (totalRetailUnits + totalCustomUnits) : totalWholesaleUnits;
  const displayedTotal = activeMode === 'retail' ? retailTotal : wholesaleTotal;
  const displayedUnconfirmed = activeMode === 'retail' ? (hasUnconfirmedRetail || customPicaderas.length > 0) : hasUnconfirmedWholesale;

  // Filtered Products for Customer Simulator
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todas' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // ACTION: Update Retail Units
  const handleUpdateRetailUnits = (
    productId: string,
    newUnits: number,
    breakdown?: Record<string, number>
  ) => {
    setRetailCart((prev) => {
      if (newUnits <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: {
          units: newUnits,
          fillingsBreakdown: breakdown || prev[productId]?.fillingsBreakdown,
        },
      };
    });
  };

  // ACTION: Drop product onto Packaging Tray/Box
  const handleDropProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || !prod.available) return;

    const step =
      prod.sales_modality === 'solo_docena' ? 12 : prod.sales_modality === 'solo_unidad' ? 1 : 1;

    if (comboUnitLimit !== null) {
      const remainingAllowed = comboUnitLimit - totalRetailUnits;
      if (remainingAllowed <= 0) {
        alert(
          `Has alcanzado el límite de ${comboUnitLimit} unidades de tu combo. Si deseas agregar más picaderas, cambia a un tamaño mayor o a combo Libre.`
        );
        return;
      }
      const canAdd = Math.min(step, remainingAllowed);
      handleUpdateRetailUnits(
        productId,
        (retailCart[productId]?.units || 0) + canAdd
      );
    } else {
      handleUpdateRetailUnits(
        productId,
        (retailCart[productId]?.units || 0) + step
      );
    }
  };

  // ACTION: Combo Compartido Especial
  // Loads 1/2 dozen (6 units) of quipes, pastelitos, croquetas and bolas de yuca
  const handleAddSpecialCombo = () => {
    const nextCart = { ...retailCart };
    SPECIAL_COMBO_ITEMS.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        nextCart[item.productId] = {
          units: item.units,
          fillingsBreakdown: prod.fillings.length > 0 ? { [prod.fillings[0]]: item.units } : undefined,
        };
      }
    });

    setRetailCart(nextCart);
    setSelectedSizeId('mediano'); // 24 units size fits perfectly
    setRetailStep('picaderas');
    setRefreshToast('¡Combo Compartido Especial cargado con 24 picaderas!');
    setTimeout(() => setRefreshToast(''), 3000);
  };

  // NUEVO: Manejo del cambio de unidades en "A tu medida" con advertencia de excedente
  const handleChangeCustomUnits = (newUnits: number) => {
    if (newUnits < totalRetailUnits) {
      const excess = totalRetailUnits - newUnits;
      const confirmTrim = window.confirm(
        `Has seleccionado un límite de ${newUnits} unidades, pero ya tienes ${totalRetailUnits} picaderas seleccionadas (${excess} de excedente).\n\n` +
        `• Pulsa [Aceptar] para recortar las ${excess} picaderas de más automáticamente.\n` +
        `• Pulsa [Cancelar] para mantener las ${customComboUnits} unidades anteriores.`
      );

      if (confirmTrim) {
        // Recortar excedente de forma balanceada desde el carrito actual
        let toRemove = excess;
        const updated = { ...retailCart };
        const keys = Object.keys(updated);

        for (let i = keys.length - 1; i >= 0 && toRemove > 0; i--) {
          const k = keys[i];
          const item = updated[k];
          if (!item || item.units <= 0) continue;

          if (item.units <= toRemove) {
            toRemove -= item.units;
            delete updated[k];
          } else {
            const nextUnits = item.units - toRemove;
            toRemove = 0;
            updated[k] = {
              ...item,
              units: nextUnits,
            };
          }
        }

        setRetailCart(updated);
        setCustomComboUnits(newUnits);
        setRefreshToast(`Límite ajustado a ${newUnits} uds y excedente recortado.`);
        setTimeout(() => setRefreshToast(''), 3500);
      }
      return;
    }

    setCustomComboUnits(newUnits);
  };

  // ACTION: Sorpréndeme (Funciona equilibrado para cualquier tamaño y para "A tu medida")
  const handleSurpriseMe = () => {
    const targetLimit = comboUnitLimit || 24;
    // Solo productos disponibles con precio definido (sin agotados ni "precio por confirmar")
    const eligible = products.filter(
      (p) => p.available && (p.price_unit !== null || p.price_dozen !== null)
    );
    if (eligible.length === 0) return;

    // Máximo 3 a 4 unidades del mismo producto salvo que N sea grande
    const maxPerProduct =
      targetLimit <= 12 ? 3 : targetLimit <= 24 ? 4 : Math.max(4, Math.ceil(targetLimit / eligible.length));

    const newCart: Record<string, { units: number; fillingsBreakdown?: Record<string, number> }> = {};
    let unitsLeft = targetLimit;

    // Barajar productos disponibles
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());

    let safety = 0;
    while (unitsLeft > 0 && safety < 30) {
      for (const prod of shuffled) {
        if (unitsLeft <= 0) break;
        const assigned = newCart[prod.id]?.units || 0;
        if (assigned >= maxPerProduct && unitsLeft > shuffled.length) continue;

        const chunk = Math.min(unitsLeft, Math.min(maxPerProduct - assigned, Math.floor(Math.random() * 2) + 2));
        if (chunk > 0) {
          const totalForProd = assigned + chunk;
          newCart[prod.id] = {
            units: totalForProd,
            fillingsBreakdown: prod.fillings.length > 0 ? { [prod.fillings[0]]: totalForProd } : undefined,
          };
          unitsLeft -= chunk;
        }
      }
      safety++;
    }

    // Si aún quedan unidades residuales por distribuir
    if (unitsLeft > 0) {
      for (const prod of shuffled) {
        if (unitsLeft <= 0) break;
        const assigned = newCart[prod.id]?.units || 0;
        newCart[prod.id] = {
          units: assigned + unitsLeft,
          fillingsBreakdown: prod.fillings.length > 0 ? { [prod.fillings[0]]: assigned + unitsLeft } : undefined,
        };
        unitsLeft = 0;
      }
    }

    setRetailCart(newCart);
    setRetailStep('picaderas');
    setRefreshToast(`¡Combo sorpresa equilibrado generado (${targetLimit} uds)!`);
    setTimeout(() => setRefreshToast(''), 3000);
  };

  // NUEVO: Completar al azar (rellena únicamente las unidades faltantes respetando lo que ya eligió)
  const handleAutoCompleteRandom = () => {
    if (comboUnitLimit === null) {
      alert('El combo Libre no tiene límite de unidades fijado.');
      return;
    }

    if (totalRetailUnits >= comboUnitLimit) {
      setRefreshToast(`¡Tu combo ya está completo! (${totalRetailUnits}/${comboUnitLimit} uds)`);
      setTimeout(() => setRefreshToast(''), 3000);
      return;
    }

    let unitsNeeded = comboUnitLimit - totalRetailUnits;
    const initialNeeded = unitsNeeded;
    const eligible = products.filter(
      (p) => p.available && (p.price_unit !== null || p.price_dozen !== null)
    );
    if (eligible.length === 0) return;

    const nextCart = { ...retailCart };
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());

    let safety = 0;
    while (unitsNeeded > 0 && safety < 30) {
      for (const prod of shuffled) {
        if (unitsNeeded <= 0) break;
        const toAdd = Math.min(unitsNeeded, Math.floor(Math.random() * 2) + 1); // 1 o 2 unidades
        const current = nextCart[prod.id]?.units || 0;
        const newTotal = current + toAdd;

        nextCart[prod.id] = {
          units: newTotal,
          fillingsBreakdown:
            prod.fillings.length > 0
              ? { ...(nextCart[prod.id]?.fillingsBreakdown || {}), [prod.fillings[0]]: newTotal }
              : undefined,
        };
        unitsNeeded -= toAdd;
      }
      safety++;
    }

    setRetailCart(nextCart);
    setRefreshToast(`¡Se completaron al azar las ${initialNeeded} unidades faltantes!`);
    setTimeout(() => setRefreshToast(''), 3500);
  };

  // ACTION: Refrescar Selección
  const handleRefreshSelection = () => {
    setRetailCart({});
    setCustomPicaderas([]);
    setRefreshToast('Selección de picaderas restablecida a cero.');
    setTimeout(() => setRefreshToast(''), 3000);
  };

  // ACTION: Reiniciar Combo
  const handleResetCombo = () => {
    handleRefreshSelection();
    setRetailStep('size');
  };

  // Wholesale Handlers
  const handleUpdateWholesaleQuantity = (productId: string, units: number) => {
    setWholesaleCart((prev) => {
      if (units <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: units };
    });
  };

  const handleAddWholesaleCombo = (combo: WholesaleCombo) => {
    setWholesaleCombos((prev) => [...prev, combo]);
    setIsCartOpen(true);
  };

  const handleRemoveWholesaleCombo = (comboId: string) => {
    setWholesaleCombos((prev) => prev.filter((c) => c.id !== comboId));
  };

  const handleClearCart = () => {
    setRetailCart({});
    setWholesaleCart({});
    setWholesaleCombos([]);
    setCustomPicaderas([]);
  };

  // HANDLERS FOR CUSTOM PICADERAS OUTSIDE MENU
  const handleAddCustomPicadera = (name: string, units: number, notes?: string) => {
    if (!name.trim()) return;
    const item: CustomPicaderaRequest = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      units: Math.max(1, units),
      notes: notes?.trim() || undefined,
    };
    setCustomPicaderas((prev) => [...prev, item]);
    setNewCustomName('');
    setNewCustomNotes('');
    setNewCustomUnits(12);
    setCustomPicaderaToast(`"${item.name}" agregada a tu solicitud especial`);
    setTimeout(() => setCustomPicaderaToast(''), 3500);
  };

  const handleRemoveCustomPicadera = (id: string) => {
    setCustomPicaderas((prev) => prev.filter((c) => c.id !== id));
  };

  // ADMIN SYNC HANDLERS
  const handleSaveProducts = async (updated: Product[]) => {
    setProducts(updated);

    // Clean up cart if any deleted products were in customer selection
    const remainingIds = new Set(updated.map((p) => p.id));
    setRetailCart((prev) => {
      const next: Record<string, { units: number; fillingsBreakdown?: Record<string, number> }> = {};
      Object.entries(prev).forEach(([id, data]) => {
        if (remainingIds.has(id)) {
          next[id] = data;
        }
      });
      return next;
    });

    setWholesaleCart((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([id, qty]) => {
        if (remainingIds.has(id)) {
          next[id] = qty;
        }
      });
      return next;
    });

    await syncCatalogToCloud(updated, settings, categories, comboSizes);
  };

  const handleSaveCategories = async (updated: string[]) => {
    setCategories(updated);
    await syncCatalogToCloud(products, settings, updated, comboSizes);
  };

  const handleSaveComboSizes = async (updated: ComboSize[]) => {
    setComboSizes(updated);
    await syncCatalogToCloud(products, settings, categories, updated);
  };

  const handleSaveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    await syncCatalogToCloud(products, updated, categories, comboSizes);
  };

  const handleRestoreDefaults = async () => {
    clearDeletedProductsRecord();
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setComboSizes(INITIAL_COMBO_SIZES);
    setSettings(INITIAL_SETTINGS);
    await syncCatalogToCloud(INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_CATEGORIES, INITIAL_COMBO_SIZES);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9F6]">
      {/* Top Bar Contract Compliant Header */}
      <Navbar
        settings={settings}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        cartUnits={displayedUnits}
        cartTotal={displayedTotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isOnline={isOnline}
      />

      {/* Hero Section */}
      <HeroSection
        settings={settings}
        onAddSpecialCombo={handleAddSpecialCombo}
        onSurpriseMe={handleSurpriseMe}
        onResetCombo={handleResetCombo}
        hasItems={totalRetailUnits > 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {activeMode === 'retail' ? (
          /* ================= RETAIL CUSTOMER SIMULATOR ================= */
          <div className="space-y-6">
            {/* Refresh / Action Notification Toast */}
            {refreshToast && (
              <div className="bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{refreshToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRefreshToast('')}
                  className="text-white/80 hover:text-white text-xs ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Stepper Wizard Bar (Paso 1 ➔ Paso 2 ➔ Paso 3 ➔ Paso 4) */}
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-stone-200/90 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Step 1: Tamaño */}
                <button
                  type="button"
                  onClick={() => setRetailStep('size')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    retailStep === 'size'
                      ? 'bg-[#A61B1B] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-extrabold">1</span>
                  <span>Tamaño: {currentComboSize?.name}</span>
                </button>

                <span className="text-stone-300 shrink-0">➔</span>

                {/* Step 2: Picaderas */}
                <button
                  type="button"
                  onClick={() => setRetailStep('picaderas')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    retailStep === 'picaderas'
                      ? 'bg-[#A61B1B] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-extrabold">2</span>
                  <span>Picaderas ({totalRetailUnits} uds)</span>
                </button>

                <span className="text-stone-300 shrink-0">➔</span>

                {/* Step 3: Picadera Especial (NUEVA PESTAÑA ANTES DEL EMPAQUE) */}
                <button
                  type="button"
                  onClick={() => setRetailStep('custom_picadera')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    retailStep === 'custom_picadera'
                      ? 'bg-[#A61B1B] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-extrabold">3</span>
                  <span>
                    Picadera Especial {customPicaderas.length > 0 ? `(${customPicaderas.reduce((s, c) => s + c.units, 0)} uds)` : ''}
                  </span>
                </button>

                <span className="text-stone-300 shrink-0">➔</span>

                {/* Step 4: Empaque */}
                <button
                  type="button"
                  onClick={() => setRetailStep('packaging')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    retailStep === 'packaging'
                      ? 'bg-[#A61B1B] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-extrabold">4</span>
                  <span>
                    Empaque: {selectedPackaging === 'bandeja' ? 'Bandeja' : selectedPackaging === 'caja' ? 'Caja Kraft' : 'Individual'}
                  </span>
                </button>
              </div>

              {/* Refrescar selección button */}
              {(totalRetailUnits > 0 || customPicaderas.length > 0) && (
                <button
                  type="button"
                  onClick={handleRefreshSelection}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-red-700 hover:bg-red-50 border border-stone-200 transition-colors cursor-pointer shrink-0"
                  title="Refrescar y vaciar picaderas seleccionadas para empezar de nuevo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Refrescar selección</span>
                </button>
              )}
            </div>

            {/* ================= PASO 1: SELECCIONAR TAMAÑO ================= */}
            {retailStep === 'size' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-[#FFF3EE] rounded-2xl p-3.5 border border-[#A61B1B]/20 text-xs text-[#7A0F0F] flex items-center justify-between">
                  <span>
                    💡 Elige el tamaño adecuado para la cantidad de personas. Luego verás toda la variedad de picaderas disponibles.
                  </span>
                  <button
                    type="button"
                    onClick={() => setRetailStep('picaderas')}
                    className="font-bold underline hover:text-[#A61B1B] shrink-0 ml-2"
                  >
                    Saltar a picaderas ➔
                  </button>
                </div>

                <ComboSizeSelector
                  sizes={comboSizes}
                  selectedSizeId={selectedSizeId}
                  onSelectSize={(id) => {
                    setSelectedSizeId(id);
                    setRetailStep('picaderas');
                  }}
                  currentUnits={totalRetailUnits}
                  onNextStep={() => setRetailStep('picaderas')}
                  customUnits={customComboUnits}
                  onChangeCustomUnits={handleChangeCustomUnits}
                  customComboConfig={{
                    enabled: settings.custom_combo_enabled !== false,
                    name: settings.custom_combo_name,
                    tag: settings.custom_combo_tag,
                    description: settings.custom_combo_description,
                    min: settings.custom_combo_min,
                    max: settings.custom_combo_max,
                  }}
                  onAutoCompleteRandom={handleAutoCompleteRandom}
                />
              </div>
            )}

            {/* ================= PASO 2: VARIEDAD DE PICADERAS ================= */}
            {retailStep === 'picaderas' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Step 2 Progress & Action Toolbar */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#A61B1B] uppercase tracking-wider block">
                      Paso 2: Selección de Picaderas Disponibles
                    </span>
                    <h3 className="font-extrabold text-stone-900 text-base leading-tight">
                      Combo {currentComboSize?.name}:{' '}
                      <span className="text-[#A61B1B]">
                        {totalRetailUnits} {comboUnitLimit !== null ? `/ ${comboUnitLimit} uds` : 'uds'}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {comboUnitLimit !== null
                        ? comboUnitLimit - totalRetailUnits > 0
                          ? `Te faltan ${comboUnitLimit - totalRetailUnits} unidades para completar este combo.`
                          : '¡Combo completado! Ya puedes pasar a elegir tu empaque.'
                        : 'Combo libre: agrega todas las picaderas que gustes.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRetailStep('size')}
                      className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Cambiar Tamaño</span>
                    </button>

                    {/* NUEVO: Botón Completar al Azar para rellenar las unidades restantes */}
                    {comboUnitLimit !== null && comboUnitLimit - totalRetailUnits > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoCompleteRandom}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Rellenar automáticamente las unidades que faltan respetando lo ya elegido"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Completar al azar ({comboUnitLimit - totalRetailUnits})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRefreshSelection}
                      className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Refrescar y limpiar la selección"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refrescar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (totalRetailUnits === 0) {
                          alert('Por favor agrega al menos una picadera a tu combo antes de pasar al empaque.');
                          return;
                        }
                        setRetailStep('packaging');
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-4 py-2 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <span>Siguiente: Elegir Empaque</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Filter Tabs & Search Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Category Filter Pills (Functional Buttons) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <button
                      onClick={() => setSelectedCategory('Todas')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === 'Todas'
                          ? 'bg-[#A61B1B] text-white shadow-xs'
                          : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      Todas ({products.length})
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[#A61B1B] text-white shadow-xs'
                            : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar quipes, pastelitos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30"
                    />
                  </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6 space-y-2">
                    <p className="text-sm font-semibold text-stone-700">
                      No se encontraron picaderas con ese filtro.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory('Todas');
                        setSearchQuery('');
                      }}
                      className="text-xs text-[#A61B1B] font-bold underline"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProducts.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        units={retailCart[prod.id]?.units || 0}
                        fillingsBreakdown={retailCart[prod.id]?.fillingsBreakdown}
                        onUpdateUnits={(newUnits) => handleUpdateRetailUnits(prod.id, newUnits)}
                        onOpenFillings={(p) => setFillingsProduct(p)}
                        comboLimit={comboUnitLimit}
                        totalComboUnits={totalRetailUnits}
                        isCustomCombo={isCustomCombo}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Step-2 Proceed Banner */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <span className="text-xs text-stone-500">Resumen actual del combo</span>
                    <h4 className="font-extrabold text-stone-900 text-base sm:text-lg">
                      {totalRetailUnits} picaderas seleccionadas · {formatRD(retailTotal)}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {comboUnitLimit !== null && comboUnitLimit - totalRetailUnits > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoCompleteRandom}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="Rellenar automáticamente las unidades que faltan"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Completar al azar ({comboUnitLimit - totalRetailUnits})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshSelection}
                      className="px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      title="Refrescar y limpiar picaderas"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refrescar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRetailStep('custom_picadera');
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <span>Siguiente: Picadera Especial (Opcional) ➔</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= PASO 3: PICADERA ESPECIAL (FUERA DE CATÁLOGO) ================= */}
            {retailStep === 'custom_picadera' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Step 3 Header Card */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div>
                      <span className="text-[11px] font-extrabold text-[#A61B1B] uppercase tracking-wider block">
                        Paso 3 de 4: Picadera Especial o Personalizada (Opcional)
                      </span>
                      <h3 className="font-extrabold text-stone-900 text-lg sm:text-xl leading-tight">
                        ¿Deseas alguna picadera que no está en las opciones?
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                        Preparamos bocadillos criollos especiales a pedido (ej: pastelitos de camarón, mini sándwiches de pierna, quipes de chivo liniero, bolitas de mofongo, canapés). Escribe lo que buscas y las unidades, y lo incluiremos en tu cotización por WhatsApp.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setRetailStep('packaging');
                          window.scrollTo({ top: 380, behavior: 'smooth' });
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 cursor-pointer transition-colors"
                      >
                        Omitir e ir al empaque ➔
                      </button>
                    </div>
                  </div>

                  {/* Toast confirmation */}
                  {customPicaderaToast && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{customPicaderaToast}</span>
                    </div>
                  )}

                  {/* Input Form Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-[#FFF9F6] to-amber-50/50 border border-[#A61B1B]/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#A61B1B] text-white flex items-center justify-center text-xs font-bold">
                        ✍️
                      </span>
                      <h4 className="font-bold text-stone-900 text-sm">
                        Indica qué picadera deseas y cuántas unidades:
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      {/* Name input */}
                      <div className="md:col-span-6">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Nombre de la picadera o bocadillo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCustomName}
                          onChange={(e) => setNewCustomName(e.target.value)}
                          placeholder="Ej: Mini sándwiches de pierna criolla, Pastelitos de camarón..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/20 focus:border-[#A61B1B]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomPicadera(newCustomName, newCustomUnits, newCustomNotes);
                            }
                          }}
                        />
                      </div>

                      {/* Units Selector */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Cantidad (unidades)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setNewCustomUnits(Math.max(1, newCustomUnits - 1))}
                            className="w-9 h-9 rounded-xl border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={newCustomUnits}
                            onChange={(e) => setNewCustomUnits(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full text-center px-2 py-2 rounded-xl border border-stone-300 bg-white font-bold text-xs sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setNewCustomUnits(newCustomUnits + 1)}
                            className="w-9 h-9 rounded-xl border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                        {/* Quick chips */}
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {[6, 12, 24, 50].map((quick) => (
                            <button
                              key={quick}
                              type="button"
                              onClick={() => setNewCustomUnits(quick)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                newCustomUnits === quick
                                  ? 'bg-[#A61B1B] text-white'
                                  : 'bg-stone-200/70 text-stone-700 hover:bg-stone-300'
                              }`}
                            >
                              {quick}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes / Details */}
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Detalles / Relleno (opcional)
                        </label>
                        <input
                          type="text"
                          value={newCustomNotes}
                          onChange={(e) => setNewCustomNotes(e.target.value)}
                          placeholder="Ej: Salsa aparte, masa bien dorada..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/20 focus:border-[#A61B1B]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-stone-500">
                        💡 Tu solicitud será cotizada por WhatsApp por nuestro equipo al momento de enviar tu pedido.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddCustomPicadera(newCustomName, newCustomUnits, newCustomNotes)}
                        disabled={!newCustomName.trim()}
                        className="px-5 py-2.5 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-colors self-end sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Agregar picadera especial</span>
                      </button>
                    </div>
                  </div>

                  {/* Suggestions Chips */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-stone-700 block mb-2">
                      💡 Sugerencias populares fuera de catálogo (haz clic para autocompletar):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'Mini sándwiches de pierna horneada', units: 12, notes: 'Con aderezo criollo' },
                        { name: 'Pastelitos rellenos de camarones', units: 12, notes: 'Masa hojaldrada crujiente' },
                        { name: 'Quipes tradicionales de chivo liniero', units: 12, notes: 'Sabor típico dominicano' },
                        { name: 'Bolitas de mofongo con queso frito', units: 12, notes: 'Con mojo de ajo' },
                        { name: 'Canapés criollos de aguacate y tocineta', units: 12, notes: 'Base crocante' },
                      ].map((sugg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setNewCustomName(sugg.name);
                            setNewCustomUnits(sugg.units);
                            setNewCustomNotes(sugg.notes);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#FFF3EE] hover:text-[#A61B1B] border border-stone-200 text-xs font-medium text-stone-700 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                        >
                          <span className="text-stone-400">+</span>
                          <span>{sugg.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Added Picaderas List */}
                  <div className="pt-3">
                    <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider mb-2">
                      Picaderas especiales agregadas ({customPicaderas.length})
                    </h4>

                    {customPicaderas.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-center text-xs text-stone-500">
                        No has agregado picaderas fuera de menú. Si tu selección de catálogo ya está completa, haz clic en "Continuar al Empaque".
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {customPicaderas.map((cp) => (
                          <div
                            key={cp.id}
                            className="p-3.5 rounded-2xl bg-white border border-amber-200 shadow-2xs flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-2xl shrink-0">✨</span>
                              <div>
                                <h5 className="font-bold text-stone-900 text-sm leading-tight">
                                  {cp.name}
                                </h5>
                                <span className="text-xs text-[#A61B1B] font-extrabold block mt-0.5">
                                  {cp.units} {cp.units === 1 ? 'unidad' : 'unidades'}
                                </span>
                                {cp.notes && (
                                  <span className="text-[11px] text-stone-500 block mt-0.5">
                                    Nota: {cp.notes}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomPicadera(cp.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Eliminar picadera especial"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Navigation footer of Step 3 */}
                  <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setRetailStep('picaderas');
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver a Picaderas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRetailStep('packaging');
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <span>
                        {customPicaderas.length > 0
                          ? 'Siguiente: Elegir Empaque ➔'
                          : 'Continuar al Empaque ➔'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= PASO 4: EMPAQUES Y PRESENTACIÓN ================= */}
            {retailStep === 'packaging' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Step 4 Header & Action Bar */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#A61B1B] uppercase tracking-wider block">
                      Paso 4 de 4: Selección y Visualización del Empaque
                    </span>
                    <h3 className="font-extrabold text-stone-900 text-base sm:text-lg leading-tight">
                      ¿Cómo deseas la presentación de tus {totalRetailUnits + customPicaderas.reduce((s, c) => s + c.units, 0)} picaderas?
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Visualiza en vivo cómo quedará servido en Bandeja para eventos, Caja kraft con visor o en Paquetes individuales.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setRetailStep('custom_picadera')}
                      className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver a Picadera Especial</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRefreshSelection}
                      className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Refrescar y limpiar picaderas"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refrescar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCartOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <span>Pedir por WhatsApp</span>
                      <span>➔</span>
                    </button>
                  </div>
                </div>

                {/* Packaging Simulator: Interactive Drag & Drop and Packaging Visualizer */}
                <PackagingSimulator
                  products={products}
                  retailCart={retailCart}
                  selectedPackaging={selectedPackaging}
                  onChangePackaging={setSelectedPackaging}
                  onDropProduct={handleDropProduct}
                  onUpdateUnits={(id, units) => handleUpdateRetailUnits(id, units)}
                  onOpenCart={() => setIsCartOpen(true)}
                  comboLimit={comboUnitLimit}
                />
              </div>
            )}
          </div>
        ) : (
          /* ================= WHOLESALE (B2B) VIEW ================= */
          <WholesaleView
            products={products}
            wholesaleQuantities={wholesaleCart}
            onUpdateWholesaleQuantity={handleUpdateWholesaleQuantity}
            onAddWholesaleCombo={handleAddWholesaleCombo}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}
      </main>

      {/* Sticky Mobile Summary Bar (<15% viewport height) */}
      <StickyBottomBar
        cartUnits={displayedUnits}
        cartTotal={displayedTotal}
        hasUnconfirmedPrices={displayedUnconfirmed}
        onOpenCart={() => setIsCartOpen(true)}
        isWholesaleMode={activeMode === 'wholesale'}
      />

      {/* Slide-over Cart & Checkout Drawer with WhatsApp Generator */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        products={products}
        retailCart={retailCart}
        wholesaleCart={wholesaleCart}
        wholesaleCombos={wholesaleCombos}
        activeMode={activeMode}
        onUpdateRetailUnits={handleUpdateRetailUnits}
        onUpdateWholesaleUnits={handleUpdateWholesaleQuantity}
        onRemoveWholesaleCombo={handleRemoveWholesaleCombo}
        onClearCart={handleClearCart}
        settings={settings}
        selectedPackaging={selectedPackaging}
        onChangePackaging={setSelectedPackaging}
        selectedSizeId={selectedSizeId}
        comboLimit={comboUnitLimit}
        comboSizes={comboSizes}
        customPicaderas={customPicaderas}
        onRemoveCustomPicadera={handleRemoveCustomPicadera}
      />

      {/* Fillings Distribution Modal */}
      {fillingsProduct && (
        <FillingsModal
          product={fillingsProduct}
          currentUnits={retailCart[fillingsProduct.id]?.units || 0}
          existingBreakdown={retailCart[fillingsProduct.id]?.fillingsBreakdown}
          onSave={(breakdown, updatedUnits) => {
            handleUpdateRetailUnits(fillingsProduct.id, updatedUnits, breakdown);
          }}
          onClose={() => setFillingsProduct(null)}
        />
      )}

      {/* Admin Panel Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        categories={categories}
        comboSizes={comboSizes}
        settings={settings}
        onSaveProducts={handleSaveProducts}
        onSaveCategories={handleSaveCategories}
        onSaveComboSizes={handleSaveComboSizes}
        onSaveSettings={handleSaveSettings}
        onRestoreDefaults={handleRestoreDefaults}
        isOnline={isOnline}
        statusMessage={statusMsg}
        onRefreshData={refreshCatalog}
      />

      {/* Footer */}
      <Footer settings={settings} onOpenAdmin={() => setIsAdminOpen(true)} />
    </div>
  );
}
