import React, { useState } from 'react';
import { Product, PackagingType, PackagingOption } from '../types';
import { PACKAGING_OPTIONS } from '../data/initialData';
import { formatRD, formatFriendlyQuantity } from '../lib/pricing';
import {
  Package,
  Sparkles,
  Layers,
  Check,
  Eye,
  Info,
  ArrowRight,
  Maximize2,
  Trash2,
  Plus,
  UtensilsCrossed,
  Boxes,
  Gift
} from 'lucide-react';

interface PackagingSimulatorProps {
  products: Product[];
  retailCart: Record<string, { units: number; fillingsBreakdown?: Record<string, number> }>;
  selectedPackaging: PackagingType;
  onChangePackaging: (type: PackagingType) => void;
  onDropProduct: (productId: string) => void;
  onUpdateUnits: (productId: string, units: number) => void;
  onOpenCart: () => void;
  comboLimit: number | null;
}

export const PackagingSimulator: React.FC<PackagingSimulatorProps> = ({
  products,
  retailCart,
  selectedPackaging,
  onChangePackaging,
  onDropProduct,
  onUpdateUnits,
  onOpenCart,
  comboLimit,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'real_photo'>('interactive');

  const currentOption =
    PACKAGING_OPTIONS.find((opt) => opt.id === selectedPackaging) || PACKAGING_OPTIONS[0];

  const productMap = new Map(products.map((p) => [p.id, p]));

  interface TrayItem {
    product: Product;
    units: number;
    fillings?: Record<string, number>;
  }

  // Selected items in current tray
  const itemsInTray: TrayItem[] = [];
  Object.entries(retailCart).forEach(([id, data]) => {
    if (data.units > 0) {
      const p = productMap.get(id);
      if (p) {
        itemsInTray.push({
          product: p,
          units: data.units,
          fillings: data.fillingsBreakdown,
        });
      }
    }
  });

  const totalUnitsInTray = itemsInTray.reduce((acc, item) => acc + item.units, 0);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const prodId = e.dataTransfer.getData('text/plain');
    if (prodId) {
      onDropProduct(prodId);
    }
  };

  // Individual pack calculation (typical portion = 4 picaderas per individual pack)
  const unitsPerIndividualPack = 4;
  const estimatedIndividualPacks = Math.max(1, Math.ceil(totalUnitsInTray / unitsPerIndividualPack));

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 shadow-md p-4 sm:p-6 mb-8 transition-all overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFF3EE] text-[#A61B1B] text-xs font-bold border border-[#A61B1B]/20">
            <Sparkles className="w-3.5 h-3.5 text-[#F2B705]" />
            <span>Simulador Interactivo de Empaques Nill Food</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Visualiza y Arma tu Presentación
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Arrastra picaderas hacia la bandeja o agrégalas desde el catálogo. Cambia de empaque para ver el resultado exacto.
          </p>
        </div>

        {/* View mode toggle: Interactive 2D vs Real Packaging Photo */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start md:self-center">
          <button
            type="button"
            onClick={() => setViewMode('interactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'interactive'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#A61B1B]" />
            <span>Simulación en Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('real_photo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'real_photo'
                ? 'bg-white text-stone-900 shadow-xs font-bold'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#1F4E4F]" />
            <span>Foto Real del Empaque</span>
          </button>
        </div>
      </div>

      {/* Packaging Type Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {PACKAGING_OPTIONS.map((opt) => {
          const isSelected = selectedPackaging === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangePackaging(opt.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-[#A61B1B] bg-[#FFF3EE]/70 ring-2 ring-[#A61B1B]/20 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-[#A61B1B] text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {opt.badge}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[#A61B1B]" />}
                </div>
                <h3 className={`font-bold text-sm leading-snug ${isSelected ? 'text-[#7A0F0F]' : 'text-stone-900'}`}>
                  {opt.name}
                </h3>
                <p className="text-[11px] text-stone-500 mt-1 leading-tight line-clamp-2">
                  {opt.subtitle}
                </p>
              </div>

              <span className="text-[10px] text-stone-400 mt-2 font-medium block">
                {opt.id === 'bandeja'
                  ? '🍽️ Servido listo para buffet'
                  : opt.id === 'caja'
                  ? '📦 Caja con visor transparente'
                  : '🥡 Raciones individuales selladas'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Visual Canvas Area */}
      {viewMode === 'real_photo' ? (
        /* REAL PACKAGING PHOTO VIEW */
        <div className="bg-stone-900 rounded-3xl overflow-hidden border border-stone-800 grid grid-cols-1 lg:grid-cols-12 gap-0 text-white animate-in fade-in duration-300">
          <div className="lg:col-span-7 h-64 sm:h-80 relative overflow-hidden bg-black">
            <img
              src={currentOption.image_url}
              alt={currentOption.name}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/20">
              {currentOption.badge}
            </div>
          </div>

          <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#F2B705] uppercase tracking-wider">
                Especificación del Empaque
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">
                {currentOption.name}
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                {currentOption.description}
              </p>
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs space-y-1">
                <span className="font-semibold text-amber-200 block">Recomendado para:</span>
                <p className="text-stone-200 text-[11px]">{currentOption.bestFor}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
              <span>{totalUnitsInTray} unidades en tu pedido actual</span>
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className="text-[#F2B705] hover:underline font-bold"
              >
                Volver a simular ➔
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE 2D LIVE DROP ZONE & TRAY ASSEMBLY */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-3xl transition-all duration-300 p-4 sm:p-6 overflow-hidden ${
            isDragOver
              ? 'ring-4 ring-[#A61B1B] bg-amber-50/80 scale-[1.008]'
              : selectedPackaging === 'bandeja'
              ? 'bg-gradient-to-b from-[#2B231F] to-[#1C1613] text-white border-4 border-[#C59B27]/40 shadow-inner'
              : selectedPackaging === 'caja'
              ? 'bg-[#E3C8A8] text-stone-900 border-4 border-[#C9A983] shadow-md'
              : 'bg-[#F2EFE9] text-stone-900 border-2 border-stone-300 shadow-sm'
          }`}
        >
          {/* Packaging Header Banner inside Visualizer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-black/10 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {selectedPackaging === 'bandeja'
                  ? '✨'
                  : selectedPackaging === 'caja'
                  ? '📦'
                  : '🥡'}
              </span>
              <div>
                <h4
                  className={`font-extrabold text-sm sm:text-base leading-tight ${
                    selectedPackaging === 'bandeja' ? 'text-amber-200' : 'text-stone-900'
                  }`}
                >
                  {selectedPackaging === 'bandeja'
                    ? 'Bandeja de Catering para Buffet (Simulación)'
                    : selectedPackaging === 'caja'
                    ? 'Caja Kraft con Visor Transparente (Simulación)'
                    : 'Distribución en Paquetes Individuales'}
                </h4>
                <p
                  className={`text-[11px] ${
                    selectedPackaging === 'bandeja' ? 'text-stone-300' : 'text-stone-600'
                  }`}
                >
                  {selectedPackaging === 'individual'
                    ? `Tu combo de ${totalUnitsInTray} picaderas se entregará en aprox. ${estimatedIndividualPacks} paquetes individuales (${unitsPerIndividualPack} uds c/u).`
                    : `Capacidad actual: ${totalUnitsInTray} picaderas colocadas`}
                </p>
              </div>
            </div>

            {/* Drag helper hint */}
            <div
              className={`text-xs px-3 py-1 rounded-full font-medium self-start sm:self-center ${
                selectedPackaging === 'bandeja'
                  ? 'bg-white/10 text-amber-200 border border-white/20'
                  : 'bg-white/80 text-stone-700 border border-stone-200'
              }`}
            >
              ⬇️ Arrastra o presiona + para colocar picaderas
            </div>
          </div>

          {/* Visual Container Canvas Body */}
          {itemsInTray.length === 0 ? (
            /* Empty State in Tray */
            <div
              className={`rounded-2xl border-2 border-dashed py-12 px-4 text-center transition-all ${
                isDragOver
                  ? 'border-[#A61B1B] bg-[#A61B1B]/10'
                  : selectedPackaging === 'bandeja'
                  ? 'border-amber-400/30 bg-black/20 text-stone-400'
                  : 'border-stone-400/40 bg-white/40 text-stone-500'
              }`}
            >
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-white/10 mb-2">
                <UtensilsCrossed className="w-6 h-6 text-[#F2B705]" />
              </div>
              <h5 className="font-bold text-sm text-stone-700 dark:text-stone-200">
                La bandeja aún no tiene picaderas
              </h5>
              <p className="text-xs max-w-sm mx-auto mt-1 opacity-80">
                Arrastra cualquier picadera del catálogo hacia este recuadro, o utiliza los botones + para ver cómo se organizan en tu {selectedPackaging}.
              </p>
            </div>
          ) : (
            /* Populated Visual Tray Grid */
            <div className="space-y-4">
              {/* If Individual Packaging Mode: Show individual pack boxes */}
              {selectedPackaging === 'individual' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: estimatedIndividualPacks }).map((_, packIdx) => (
                      <div
                        key={packIdx}
                        className="bg-white rounded-2xl p-3 border border-stone-200 shadow-2xs flex flex-col justify-between space-y-2 hover:scale-[1.02] transition-transform"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold bg-[#A61B1B] text-white px-2 py-0.5 rounded-md">
                            Paquete #{packIdx + 1}
                          </span>
                          <span className="text-xs">🥡</span>
                        </div>

                        <div className="space-y-1 text-center py-1">
                          <div className="flex justify-center -space-x-1">
                            {itemsInTray.slice(0, 3).map((item, i) => (
                              <span
                                key={i}
                                className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 text-sm flex items-center justify-center shadow-xs"
                              >
                                {item.product.emoji}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-semibold text-stone-700 block">
                            Porción Individual
                          </span>
                          <span className="text-[10px] text-stone-400 block">
                            {unitsPerIndividualPack} picaderas surtidas + servilleta
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-stone-600 bg-white/70 p-2.5 rounded-xl border border-stone-200 text-center">
                    ✅ Cada porción viene sellada individualmente con servilleta y palillo, ideal para eventos higiénicos.
                  </p>
                </div>
              ) : (
                /* Tray / Box Layout: Arranged Items */
                <div className="space-y-4">
                  {/* Decorative Simulated Container Rim */}
                  <div
                    className={`rounded-2xl p-4 sm:p-5 border shadow-inner ${
                      selectedPackaging === 'bandeja'
                        ? 'bg-[#1F1713]/90 border-amber-500/30'
                        : 'bg-white/90 border-[#C9A983]'
                    }`}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {itemsInTray.map((item) => (
                        <div
                          key={item.product.id}
                          className={`rounded-2xl p-3 border transition-all flex flex-col justify-between ${
                            selectedPackaging === 'bandeja'
                              ? 'bg-[#2D221D] border-amber-900/50 text-white'
                              : 'bg-[#FAF6F0] border-stone-200 text-stone-900'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.product.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-10 h-10 rounded-xl object-cover border border-stone-300/40 shrink-0"
                              />
                            ) : (
                              <span className="text-2xl p-1 bg-white/10 rounded-xl shrink-0">
                                {item.product.emoji}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs truncate leading-snug">
                                {item.product.name}
                              </h5>
                              <span
                                className={`text-[11px] font-bold block ${
                                  selectedPackaging === 'bandeja'
                                    ? 'text-[#F2B705]'
                                    : 'text-[#A61B1B]'
                                }`}
                              >
                                {item.units} uds ({formatFriendlyQuantity(item.units)})
                              </span>
                            </div>
                          </div>

                          {/* Quick Adjust inside Tray */}
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                            <span className="text-[10px] opacity-70">
                              {item.fillings && Object.keys(item.fillings).length > 0
                                ? 'Con rellenos'
                                : 'Estándar'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onUpdateUnits(item.product.id, Math.max(0, item.units - 1))}
                                className="w-6 h-6 rounded-md bg-black/20 hover:bg-black/40 flex items-center justify-center font-bold text-xs"
                                title="Quitar 1"
                              >
                                -
                              </button>
                              <span className="font-bold tabular-nums text-xs min-w-4 text-center">
                                {item.units}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateUnits(item.product.id, item.units + 1)}
                                className="w-6 h-6 rounded-md bg-[#A61B1B] text-white hover:bg-[#8e1515] flex items-center justify-center font-bold text-xs"
                                title="Sumar 1"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Simulated Center Sauce Bowl in Tray */}
                      <div
                        className={`rounded-2xl p-3 border flex flex-col items-center justify-center text-center ${
                          selectedPackaging === 'bandeja'
                            ? 'bg-amber-950/40 border-amber-600/40 text-amber-200'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="text-xl mb-1">🥣</span>
                        <span className="font-bold text-xs">Salsa de la Casa</span>
                        <span className="text-[10px] opacity-80">
                          Tarrinas incluidas en el centro
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tray Bottom Action & Order Confirmation */}
          <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div
              className={`flex items-center gap-2 ${
                selectedPackaging === 'bandeja' ? 'text-stone-300' : 'text-stone-700'
              }`}
            >
              <Info className="w-4 h-4 text-[#F2B705] shrink-0" />
              <span>
                {selectedPackaging === 'bandeja'
                  ? 'Bandeja lista para servir directamente en tu mesa de invitados.'
                  : selectedPackaging === 'caja'
                  ? 'Caja kraft con visor que protege la temperatura y crocancia de los alimentos.'
                  : 'Bolsitas individuales herméticas y seguras para cada invitado.'}
              </span>
            </div>

            {totalUnitsInTray > 0 && (
              <button
                type="button"
                onClick={onOpenCart}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <span>Pedir este empaque ({totalUnitsInTray} uds)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
