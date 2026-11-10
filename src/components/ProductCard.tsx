import React, { useState, useEffect } from 'react';
import { Product, UnitStep } from '../types';
import { computeEffectivePrices, formatRD, formatFriendlyQuantity } from '../lib/pricing';
import { Plus, Minus, Settings2, AlertTriangle, Check, Utensils } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  units: number;
  fillingsBreakdown?: Record<string, number>;
  onUpdateUnits: (newUnits: number) => void;
  onOpenFillings: (product: Product) => void;
  comboLimit: number | null;
  totalComboUnits: number;
  isCustomCombo?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  units,
  fillingsBreakdown,
  onUpdateUnits,
  onOpenFillings,
  comboLimit,
  totalComboUnits,
  isCustomCombo,
}) => {
  // Step selector: 1 (Unidad), 6 (½ Docena), 12 (Docena)
  const initialStep: UnitStep =
    product.sales_modality === 'solo_docena'
      ? 12
      : product.sales_modality === 'solo_unidad'
      ? 1
      : isCustomCombo
      ? 1
      : 1;

  const [step, setStep] = useState<UnitStep>(initialStep);

  // Al usar "A tu medida", el selector se fija en "Unidad" (1) para sumar de a uno
  useEffect(() => {
    if (isCustomCombo && product.sales_modality !== 'solo_docena') {
      setStep(1);
    }
  }, [isCustomCombo, product.sales_modality]);

  const [isEditingInput, setIsEditingInput] = useState(false);
  const [inputValue, setInputValue] = useState(units.toString());
  const [imgError, setImgError] = useState(false);

  const { unit: pUnit, half: pHalf, dozen: pDozen } = computeEffectivePrices(product);

  const handleStepChange = (newStep: UnitStep) => {
    setStep(newStep);
  };

  const handleMinus = () => {
    const nextUnits = Math.max(0, units - step);
    onUpdateUnits(nextUnits);
  };

  const handlePlus = () => {
    if (!product.available) return;

    // Check combo limit if limited
    if (comboLimit !== null) {
      const remainingAllowed = comboLimit - totalComboUnits;
      if (remainingAllowed <= 0) {
        alert(`Has alcanzado el límite de ${comboLimit} unidades de tu combo. Si deseas agregar más picaderas, cambia a un tamaño mayor o a combo Libre.`);
        return;
      }
      const canAdd = Math.min(step, remainingAllowed);
      onUpdateUnits(units + canAdd);
      if (canAdd < step) {
        alert(`Se agregaron solo ${canAdd} unidades para no superar el límite de ${comboLimit} del combo.`);
      }
      return;
    }

    onUpdateUnits(units + step);
  };

  const handleDirectInputBlur = () => {
    setIsEditingInput(false);
    let val = parseInt(inputValue, 10);
    if (isNaN(val) || val < 0) val = 0;

    if (comboLimit !== null) {
      const otherUnits = totalComboUnits - units;
      const maxAllowed = comboLimit - otherUnits;
      if (val > maxAllowed) {
        alert(`El tamaño del combo permite máximo ${comboLimit} unidades en total. Ajustando a ${maxAllowed} unidades.`);
        val = Math.max(0, maxAllowed);
      }
    }

    setInputValue(val.toString());
    onUpdateUnits(val);
  };

  // Summarize fillings if distributed
  const hasFillings = product.fillings && product.fillings.length > 0;
  const fillingsSummary = fillingsBreakdown
    ? Object.entries(fillingsBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([filling, count]) => `${count} ${filling}`)
        .join(', ')
    : '';

  return (
    <div
      draggable={product.available}
      onDragStart={(e) => {
        if (!product.available) return;
        e.dataTransfer.setData('text/plain', product.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between group cursor-grab active:cursor-grabbing ${
        units > 0
          ? 'border-[#A61B1B]/40 ring-1 ring-[#A61B1B]/20 shadow-md'
          : 'border-stone-200/90 hover:border-stone-300 shadow-xs'
      } ${!product.available ? 'opacity-70 bg-stone-50 cursor-not-allowed' : ''}`}
    >
      {/* Top Media & Information */}
      <div>
        {/* Product Visual */}
        <div className="relative h-40 bg-stone-100 overflow-hidden">
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform hover:scale-105 duration-500"
              onError={() => setImgError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF3EE] to-amber-50/60 p-4">
              <span className="text-4xl mb-1 filter drop-shadow-xs">{product.emoji}</span>
              <span className="text-[11px] font-semibold text-stone-500 text-center">
                {product.category}
              </span>
            </div>
          )}

          {/* Availability pill */}
          {!product.available ? (
            <div className="absolute top-2.5 left-2.5 bg-stone-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
              Agotado por hoy
            </div>
          ) : units > 0 ? (
            <div className="absolute top-2.5 left-2.5 bg-[#A61B1B] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-xs">
              {formatFriendlyQuantity(units)}
            </div>
          ) : null}

          {/* Drag affordance badge on top right */}
          {product.available && (
            <div
              className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/80 text-white text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-xs"
              title="Arrastra hacia la bandeja para armar tu presentación"
            >
              <span className="text-[#F2B705] text-xs">✥</span>
              <span className="hidden xs:inline">Arrastrar</span>
            </div>
          )}

          {/* Category tag */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs">
            {product.category}
          </div>
        </div>

        {/* Info Content */}
        <div className="p-3.5 sm:p-4 space-y-2">
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug">
              {product.name}
            </h3>
            <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="bg-[#FCF8F5] rounded-xl p-2.5 border border-stone-200/60 text-xs">
            <div className="grid grid-cols-3 gap-1 text-center divide-x divide-stone-200">
              {/* Unidad */}
              <div className="px-1">
                <span className="block text-[10px] font-medium text-stone-500 uppercase">Unidad</span>
                <span className="font-bold text-stone-800 text-[11px]">
                  {pUnit !== null ? formatRD(pUnit) : 'Por conf.'}
                </span>
              </div>
              {/* ½ Docena */}
              <div className="px-1">
                <span className="block text-[10px] font-medium text-stone-500 uppercase">½ Docena</span>
                <span className="font-bold text-stone-800 text-[11px]">
                  {pHalf !== null ? formatRD(pHalf) : 'Por conf.'}
                </span>
              </div>
              {/* Docena */}
              <div className="px-1">
                <span className="block text-[10px] font-medium text-stone-500 uppercase">Docena</span>
                <span className="font-bold text-[#A61B1B] text-[11px]">
                  {pDozen !== null ? formatRD(pDozen) : 'Por conf.'}
                </span>
              </div>
            </div>
          </div>

          {/* Fillings indicator & customizer trigger if available */}
          {hasFillings && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onOpenFillings(product)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  fillingsSummary
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Utensils className="w-3.5 h-3.5 text-[#A61B1B] shrink-0" />
                  <span className="truncate">
                    {fillingsSummary ? `Rellenos: ${fillingsSummary}` : 'Elegir sabores / rellenos'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#A61B1B] underline shrink-0">
                  {fillingsSummary ? 'Cambiar' : 'Repartir'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls: Step Selector & Quantity Modifiers */}
      <div className="p-3.5 sm:p-4 pt-0 space-y-2.5">
        {/* Step Selector: Unidad | ½ Docena | Docena */}
        {product.sales_modality === 'todas' ? (
          <div className="flex items-center justify-between bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleStepChange(1)}
              className={`flex-1 py-1 text-center rounded-lg transition-all ${
                step === 1
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Unidad (+1)
            </button>
            <button
              type="button"
              onClick={() => handleStepChange(6)}
              className={`flex-1 py-1 text-center rounded-lg transition-all ${
                step === 6
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              ½ Doc (+6)
            </button>
            <button
              type="button"
              onClick={() => handleStepChange(12)}
              className={`flex-1 py-1 text-center rounded-lg transition-all ${
                step === 12
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Docena (+12)
            </button>
          </div>
        ) : product.sales_modality === 'solo_unidad' ? (
          <div className="text-center text-[11px] font-medium text-stone-500 bg-stone-100 py-1 rounded-lg">
            Modalidad: Solo por unidad (+1)
          </div>
        ) : (
          <div className="text-center text-[11px] font-medium text-stone-500 bg-stone-100 py-1 rounded-lg">
            Modalidad: Solo por docena (+12)
          </div>
        )}

        {/* Counter Buttons: Minus | Direct Input | Plus */}
        <div className="flex items-center justify-between gap-2">
          {/* Subtract button */}
          <button
            type="button"
            onClick={handleMinus}
            disabled={units <= 0}
            className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-stone-800 font-bold transition-all cursor-pointer"
            aria-label="Restar"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Interactive Editable Number */}
          <div className="flex-1 text-center">
            {isEditingInput ? (
              <input
                type="number"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleDirectInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDirectInputBlur();
                }}
                autoFocus
                className="w-full text-center font-extrabold text-base text-stone-900 border border-[#A61B1B] rounded-lg py-1 focus:outline-none ring-2 ring-[#A61B1B]/20"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setInputValue(units.toString());
                  setIsEditingInput(true);
                }}
                className="w-full py-1 text-center group cursor-pointer"
                title="Toca para escribir la cantidad exacta"
              >
                <span className="text-base sm:text-lg font-extrabold text-stone-900 group-hover:text-[#A61B1B] transition-colors tabular-nums">
                  {units} <span className="text-xs font-normal text-stone-500">uds</span>
                </span>
                <span className="block text-[10px] text-stone-400 group-hover:text-stone-600">
                  (toca para editar)
                </span>
              </button>
            )}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={handlePlus}
            disabled={!product.available}
            className="w-10 h-10 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-white font-bold transition-all shadow-sm cursor-pointer"
            aria-label="Agregar"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
