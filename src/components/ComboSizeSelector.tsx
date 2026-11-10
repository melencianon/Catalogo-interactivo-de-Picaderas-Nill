import React, { useState, useEffect } from 'react';
import { ComboSize } from '../types';
import { Layers, CheckCircle2, AlertCircle, Plus, Minus, Sparkles } from 'lucide-react';

interface ComboSizeSelectorProps {
  sizes: ComboSize[];
  selectedSizeId: string;
  onSelectSize: (sizeId: string) => void;
  currentUnits: number;
  onNextStep?: () => void;
  // NUEVAS PROPIEDADES PARA LA TARJETA "A TU MEDIDA"
  customUnits?: number;
  onChangeCustomUnits?: (units: number) => void;
  customComboConfig?: {
    enabled?: boolean;
    name?: string;
    tag?: string;
    description?: string;
    min?: number;
    max?: number;
  };
  onAutoCompleteRandom?: () => void;
}

export const ComboSizeSelector: React.FC<ComboSizeSelectorProps> = ({
  sizes,
  selectedSizeId,
  onSelectSize,
  currentUnits,
  onNextStep,
  customUnits = 12,
  onChangeCustomUnits,
  customComboConfig,
  onAutoCompleteRandom,
}) => {
  // Configuración de límites de "A tu medida"
  const isCustomCombo = selectedSizeId === 'a-tu-medida';
  const customMin = customComboConfig?.min ?? 6;
  const customMax = customComboConfig?.max ?? 200;
  const isCustomEnabled = customComboConfig?.enabled !== false;

  // Límite efectivo según el tamaño seleccionado
  const currentSize = isCustomCombo
    ? {
        id: 'a-tu-medida',
        name: customComboConfig?.name || 'A tu medida',
        units: customUnits,
        tag: `${customUnits} uds`,
        recommendedFor: customComboConfig?.description || 'Personaliza la cantidad exacta',
      }
    : sizes.find((s) => s.id === selectedSizeId) || sizes[0];

  const limit = isCustomCombo ? customUnits : (currentSize?.units ?? null);

  const isUnlimited = limit === null;
  const isFull = !isUnlimited && currentUnits >= limit;
  const remaining = !isUnlimited ? Math.max(0, limit - currentUnits) : null;
  const progressPercent = !isUnlimited && limit > 0 ? Math.min(100, (currentUnits / limit) * 100) : 100;

  // Estado local para edición directa del número en "A tu medida"
  const [typedValue, setTypedValue] = useState<string>(customUnits.toString());

  useEffect(() => {
    setTypedValue(customUnits.toString());
  }, [customUnits]);

  // Manejo de incremento y decremento numérico en "A tu medida"
  const handleStepCustom = (delta: number) => {
    const nextVal = Math.min(customMax, Math.max(customMin, customUnits + delta));
    if (onChangeCustomUnits) {
      onChangeCustomUnits(nextVal);
    }
  };

  const handleBlurInput = () => {
    const parsed = parseInt(typedValue, 10);
    if (isNaN(parsed) || parsed < customMin) {
      if (onChangeCustomUnits) onChangeCustomUnits(customMin);
      setTypedValue(customMin.toString());
    } else if (parsed > customMax) {
      if (onChangeCustomUnits) onChangeCustomUnits(customMax);
      setTypedValue(customMax.toString());
    } else {
      if (onChangeCustomUnits) onChangeCustomUnits(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  // Atajos rápidos solicitados: 6, 10, 15, 20, 30
  const shortcuts = [6, 10, 15, 20, 30].filter((n) => n >= customMin && n <= customMax);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200/80 mb-6">
      {/* Title & Size tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFF3EE] text-[#A61B1B] flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              1. Selecciona el tamaño de tu combo
            </h2>
            <p className="text-xs text-stone-500">
              El límite se contabiliza en unidades totales según lo que agregues.
            </p>
          </div>
        </div>

        {/* Status text */}
        <div className="text-right flex items-center justify-end gap-2 text-xs flex-wrap">
          {isUnlimited ? (
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {currentUnits} {currentUnits === 1 ? 'unidad' : 'unidades'} seleccionadas (Sin límite)
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Botón Completar al Azar en cabecera */}
              {remaining !== null && remaining > 0 && onAutoCompleteRandom && (
                <button
                  type="button"
                  onClick={onAutoCompleteRandom}
                  className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-900 bg-amber-100/90 hover:bg-amber-200 px-2.5 py-1 rounded-full border border-amber-300 transition-all cursor-pointer shadow-2xs"
                  title="Completar al azar las unidades que faltan respetando lo ya elegido"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Completar al azar ({remaining} faltantes)</span>
                </button>
              )}

              {isFull ? (
                <span className="inline-flex items-center gap-1 font-bold text-[#A61B1B] bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ¡Combo completo ({currentUnits}/{limit} uds)!
                </span>
              ) : (
                <span className="font-medium text-stone-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {currentUnits} de {limit} uds · <strong className="text-amber-800">Quedan {remaining}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Segmented Combo Buttons: Grid con tamaños predefinidos + Nueva tarjeta "A tu medida" */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
        {sizes.map((size) => {
          const isSelected = size.id === selectedSizeId;
          return (
            <button
              key={size.id}
              onClick={() => onSelectSize(size.id)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-[#A61B1B] bg-[#FFF3EE] ring-2 ring-[#A61B1B]/20 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-bold ${isSelected ? 'text-[#7A0F0F]' : 'text-stone-900'}`}>
                  {size.name}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                    isSelected ? 'bg-[#A61B1B] text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {size.tag}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-tight">
                {size.recommendedFor}
              </p>
            </button>
          );
        })}

        {/* NUEVA TARJETA: "A tu medida" (Tú eliges las unidades) */}
        {isCustomEnabled && (
          <button
            key="a-tu-medida"
            onClick={() => onSelectSize('a-tu-medida')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
              selectedSizeId === 'a-tu-medida'
                ? 'border-[#A61B1B] bg-[#FFF3EE] ring-2 ring-[#A61B1B]/20 shadow-xs'
                : 'border-stone-200 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={`text-xs font-bold ${selectedSizeId === 'a-tu-medida' ? 'text-[#7A0F0F]' : 'text-stone-900'}`}>
                {customComboConfig?.name || 'A tu medida'}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                  selectedSizeId === 'a-tu-medida' ? 'bg-[#A61B1B] text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {customComboConfig?.tag || 'Tú eliges las unidades'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              {customComboConfig?.description || 'Personaliza la cantidad exacta'}
            </p>
          </button>
        )}
      </div>

      {/* NUEVO PANEL: Selector numérico y atajos rápidos cuando "A tu medida" está seleccionado */}
      {isCustomCombo && (
        <div className="p-3.5 bg-[#FFF9F6] border border-[#A61B1B]/25 rounded-2xl mb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <span>🎯 Define la cantidad total de picaderas:</span>
                <span className="text-[11px] font-normal text-stone-500">
                  (Mínimo {customMin} - Máximo {customMax} uds)
                </span>
              </span>
              <p className="text-[11px] text-stone-500 leading-tight">
                Podrás repartir estas {customUnits} unidades libremente entre todas las picaderas y rellenos.
              </p>
            </div>

            {/* Selector de cantidad con botones - y + y campo escribible */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleStepCustom(-1)}
                disabled={customUnits <= customMin}
                className="w-8 h-8 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                title="Restar 1 unidad"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <input
                  type="number"
                  min={customMin}
                  max={customMax}
                  value={typedValue}
                  onChange={(e) => setTypedValue(e.target.value)}
                  onBlur={handleBlurInput}
                  onKeyDown={handleKeyDown}
                  className="w-16 h-8 text-center text-sm font-extrabold text-[#7A0F0F] bg-white border border-[#A61B1B]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A61B1B]/30 shadow-2xs"
                />
                <span className="absolute -bottom-4 left-0 right-0 text-center text-[9px] text-stone-400 font-semibold pointer-events-none">
                  unidades
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStepCustom(1)}
                disabled={customUnits >= customMax}
                className="w-8 h-8 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center font-bold text-sm cursor-pointer shadow-2xs"
                title="Sumar 1 unidad"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Atajos rápidos (6, 10, 15, 20, 30) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-stone-200/60">
            <span className="text-[11px] font-semibold text-stone-600 mr-1">Atajos rápidos:</span>
            {shortcuts.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => onChangeCustomUnits && onChangeCustomUnits(sc)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customUnits === sc
                    ? 'bg-[#A61B1B] text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-400 hover:bg-stone-50'
                }`}
              >
                {sc} uds
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar (if limited) */}
      {!isUnlimited && (
        <div className="space-y-1">
          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200/60">
            <div
              className={`h-full transition-all duration-300 ${
                isFull ? 'bg-[#A61B1B]' : progressPercent > 75 ? 'bg-[#F2B705]' : 'bg-[#1F4E4F]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-stone-500">
            <span>0 uds</span>
            <span>Límite: {limit} uds</span>
          </div>
        </div>
      )}

      {/* Action to proceed to picaderas variety */}
      {onNextStep && (
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Tamaño seleccionado:{' '}
            <strong className="text-[#A61B1B]">
              {isCustomCombo
                ? `${customComboConfig?.name || 'A tu medida'} (${customUnits} uds)`
                : `${currentSize.name} (${currentSize.tag})`}
            </strong>
          </span>
          <button
            type="button"
            onClick={onNextStep}
            className="px-4 py-2 bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Ver Picaderas Disponibles</span>
            <span>➔</span>
          </button>
        </div>
      )}
    </div>
  );
};
