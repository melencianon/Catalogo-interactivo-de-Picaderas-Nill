import React, { useState } from 'react';
import { Product, WholesaleCombo } from '../types';
import { WHOLESALE_COMBOS } from '../data/initialData';
import { formatRD, calculateWholesaleItemSubtotal } from '../lib/pricing';
import { Building2, Package, Clock, ShieldCheck, Plus, Minus, Check, ShoppingBag, Sparkles } from 'lucide-react';

interface WholesaleViewProps {
  products: Product[];
  wholesaleQuantities: Record<string, number>;
  onUpdateWholesaleQuantity: (productId: string, units: number) => void;
  onAddWholesaleCombo: (combo: WholesaleCombo) => void;
  onOpenCart: () => void;
}

export const WholesaleView: React.FC<WholesaleViewProps> = ({
  products,
  wholesaleQuantities,
  onUpdateWholesaleQuantity,
  onAddWholesaleCombo,
  onOpenCart,
}) => {
  // Filter products that have wholesale pricing
  const wholesaleProducts = products.filter(
    (p) => p.wholesale_unit_price !== null || p.wholesale_batch_price !== null
  );

  const totalWholesaleUnits = Object.values(wholesaleQuantities).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* B2B Commercial Banner */}
      <div className="bg-gradient-to-r from-[#1F4E4F] via-[#2A6566] to-[#1F4E4F] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-semibold backdrop-blur-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span>División B2B & Catering para Negocios</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Catálogo al Por Mayor Nill Food
          </h2>

          <p className="text-sm text-stone-200 leading-relaxed">
            Abastece tu cafetería, evento corporativo, food truck o colmado gourmet con las auténticas picaderas criollas con precios especiales por lote.
          </p>

          {/* Key conditions badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center gap-2 border border-white/15">
              <Package className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">Mínimo 50 unidades</span>
                <span className="text-stone-300 text-[11px]">Por tipo de picadera</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center gap-2 border border-white/15">
              <Clock className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">Entrega 24-48 horas</span>
                <span className="text-stone-300 text-[11px]">Pedidos antes de 3:00 PM</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center gap-2 border border-white/15">
              <ShieldCheck className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">Condición de pago</span>
                <span className="text-stone-300 text-[11px]">50% anticipo / 50% entrega</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Ready Wholesale Combos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F2B705]" />
              Combos Mayoristas Listos para Encargar
            </h3>
            <p className="text-xs text-stone-500">
              Packs estandarizados de alta rotación para negocios y eventos multitudinarios.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WHOLESALE_COMBOS.map((combo) => (
            <div
              key={combo.id}
              className="bg-white rounded-2xl border-2 border-stone-200/90 hover:border-[#1F4E4F]/50 p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#1F4E4F] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    {combo.badge}
                  </span>
                  <span className="text-lg font-extrabold text-[#A61B1B]">
                    {formatRD(combo.price)}
                  </span>
                </div>

                <h4 className="font-bold text-stone-900 text-base leading-snug">
                  {combo.title}
                </h4>

                <p className="text-xs text-stone-500">
                  {combo.description}
                </p>

                {/* Items checklist */}
                <ul className="space-y-1.5 pt-1 text-xs text-stone-700">
                  {combo.itemsList.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => onAddWholesaleCombo(combo)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1F4E4F] hover:bg-[#163839] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>Cargar Combo al Pedido</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Wholesale Individual Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900">
              Picaderas y Salsas por Lote (Mínimo 50 uds)
            </h3>
            <p className="text-xs text-stone-500">
              Haz clic en +50 para sumar lotes comerciales completos o escribe la cantidad exacta.
            </p>
          </div>
          {totalWholesaleUnits > 0 && (
            <button
              onClick={onOpenCart}
              className="text-xs font-bold text-[#A61B1B] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ver pedido ({totalWholesaleUnits} uds)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wholesaleProducts.map((prod) => {
            const qty = wholesaleQuantities[prod.id] || 0;
            const { subtotal, breakdownText } = calculateWholesaleItemSubtotal(prod, qty);

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                  qty >= 50
                    ? 'border-[#1F4E4F] ring-1 ring-[#1F4E4F]/30 bg-teal-50/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                      />
                    ) : (
                      <span className="text-3xl p-1.5 bg-[#FFF3EE] rounded-xl shrink-0">{prod.emoji}</span>
                    )}
                    <div className="flex-1">
                      <h4 className="font-bold text-stone-900 text-sm leading-snug">
                        {prod.name}
                      </h4>
                      <span className="text-[11px] text-stone-500 block">
                        {prod.category}
                      </span>
                    </div>
                  </div>

                  {/* Wholesale Pricing Table */}
                  <div className="my-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-stone-200">
                      <span className="text-stone-500">Precio unidad:</span>
                      <span className="font-bold text-stone-900">
                        {prod.wholesale_unit_price ? formatRD(prod.wholesale_unit_price) : 'N/D'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-stone-500">Lote de 50 unidades:</span>
                      <span className="font-extrabold text-[#1F4E4F]">
                        {prod.wholesale_batch_price ? formatRD(prod.wholesale_batch_price) : 'N/D'}
                      </span>
                    </div>
                  </div>

                  {/* Order quantity breakdown */}
                  {qty > 0 && (
                    <div className="mb-2 text-xs flex justify-between items-center text-stone-700">
                      <span className="font-medium text-teal-800">{breakdownText}</span>
                      <span className="font-extrabold text-[#A61B1B]">{formatRD(subtotal)}</span>
                    </div>
                  )}
                </div>

                {/* Controls: Step by 50 units */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, qty - 50);
                      onUpdateWholesaleQuantity(prod.id, next);
                    }}
                    disabled={qty <= 0}
                    className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-stone-800 text-xs cursor-pointer"
                    title="Restar 50 unidades"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center">
                    <span className="font-extrabold text-stone-900 text-base tabular-nums">
                      {qty}{' '}
                      <span className="text-[11px] font-normal text-stone-500">
                        uds
                      </span>
                    </span>
                    {qty > 0 && qty < 50 && (
                      <span className="block text-[10px] text-amber-700 font-semibold">
                        (Mínimo 50 uds)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = qty === 0 ? 50 : qty + 50;
                      onUpdateWholesaleQuantity(prod.id, next);
                    }}
                    className="h-10 px-3 rounded-xl bg-[#1F4E4F] hover:bg-[#163839] active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Agregar 50 unidades"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+50 uds</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Sales Representative Card (from Brochure) */}
      <div className="bg-[#FFF3EE] rounded-3xl p-6 border border-[#A61B1B]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[11px] font-bold text-[#A61B1B] uppercase tracking-wider">
            Atención Personalizada para Negocios
          </span>
          <h4 className="text-base font-extrabold text-stone-900">
            Nilka Melenciano · Representante de Ventas Nill Food
          </h4>
          <p className="text-xs text-stone-600 max-w-lg">
            ¿Deseas coordinar una degustación, cotización de volumen o suministro fijo para tu food shop o evento corporativo? Contáctanos directamente.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://wa.me/18098733960?text=Hola%20Nilka,%20deseo%20informaci%C3%B3n%20para%20suministro%20al%20por%20mayor%20de%20picaderas."
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <span>WhatsApp Directo</span>
          </a>
          <a
            href="mailto:nillfood20@gmail.com"
            className="px-4 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs"
          >
            <span>Correo</span>
          </a>
        </div>
      </div>
    </div>
  );
};
