import React, { useState } from 'react';
import { Product } from '../types';
import { X, Check, Utensils, Sparkles, Plus, Minus } from 'lucide-react';

interface FillingsModalProps {
  product: Product;
  currentUnits: number;
  existingBreakdown?: Record<string, number>;
  onSave: (breakdown: Record<string, number>, updatedUnits: number) => void;
  onClose: () => void;
}

export const FillingsModal: React.FC<FillingsModalProps> = ({
  product,
  currentUnits,
  existingBreakdown,
  onSave,
  onClose,
}) => {
  // If product units is 0, initialize to at least 6 or 12 so they can pick
  const targetUnits = currentUnits > 0 ? currentUnits : 6;
  const [totalUnits, setTotalUnits] = useState(targetUnits);

  // Initialize distribution
  const [breakdown, setBreakdown] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    product.fillings.forEach((f) => {
      initial[f] = existingBreakdown?.[f] ?? 0;
    });

    // If total assigned is 0, give all to first filling or evenly
    const sum = Object.values(initial).reduce((a, b) => a + b, 0);
    if (sum === 0 && product.fillings.length > 0) {
      initial[product.fillings[0]] = targetUnits;
    }
    return initial;
  });

  const assignedSum = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const remainingToAssign = totalUnits - assignedSum;

  const handleAdjustFilling = (filling: string, delta: number) => {
    const current = breakdown[filling] || 0;
    const next = current + delta;
    if (next < 0) return;

    if (delta > 0 && assignedSum >= totalUnits) {
      // Increase total units automatically or prevent?
      setTotalUnits((prev) => prev + 1);
    }

    setBreakdown((prev) => ({
      ...prev,
      [filling]: next,
    }));
  };

  const handleEvenDistribute = () => {
    const numFillings = product.fillings.length;
    if (numFillings === 0) return;

    const basePerFilling = Math.floor(totalUnits / numFillings);
    let remainder = totalUnits % numFillings;

    const nextBreakdown: Record<string, number> = {};
    product.fillings.forEach((f, idx) => {
      nextBreakdown[f] = basePerFilling + (idx < remainder ? 1 : 0);
    });

    setBreakdown(nextBreakdown);
  };

  const handleConfirm = () => {
    onSave(breakdown, totalUnits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#A61B1B] to-[#7A0F0F] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-[#F2B705]" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Repartir Rellenos
              </h3>
              <p className="text-xs text-amber-100/90 truncate max-w-[220px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Units Counter & Quick Buttons */}
        <div className="p-4 bg-[#FCF8F5] border-b border-stone-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-500 block">Total a repartir:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                onClick={() => {
                  if (totalUnits > 1) {
                    setTotalUnits((prev) => prev - 1);
                  }
                }}
                className="w-7 h-7 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <span className="font-extrabold text-base text-stone-900 tabular-nums min-w-[2.5rem] text-center">
                {totalUnits} uds
              </span>
              <button
                onClick={() => setTotalUnits((prev) => prev + 1)}
                className="w-7 h-7 rounded-lg bg-[#A61B1B] hover:bg-[#8e1515] text-white font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleEvenDistribute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors cursor-pointer border border-amber-300/70"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Partes iguales</span>
          </button>
        </div>

        {/* Status bar */}
        <div className="px-5 py-2 text-xs flex justify-between items-center border-b border-stone-100">
          <span className="text-stone-600">
            Asignadas: <strong>{assignedSum}</strong> de <strong>{totalUnits}</strong>
          </span>
          {remainingToAssign > 0 ? (
            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
              Faltan {remainingToAssign} uds
            </span>
          ) : remainingToAssign < 0 ? (
            <span className="text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded-md">
              Exceso de {Math.abs(remainingToAssign)} uds
            </span>
          ) : (
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" /> Distribución exacta
            </span>
          )}
        </div>

        {/* Fillings list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {product.fillings.map((filling) => {
            const count = breakdown[filling] || 0;
            return (
              <div
                key={filling}
                className="flex items-center justify-between p-3 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 transition-colors"
              >
                <div>
                  <span className="font-semibold text-stone-900 text-sm block">
                    {filling}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {count > 0 ? `${count} unidad${count > 1 ? 'es' : ''}` : 'Sin asignar'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustFilling(filling, -1)}
                    disabled={count <= 0}
                    className="w-9 h-9 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-stone-800 font-bold transition-all shadow-2xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-8 text-center font-bold text-stone-900 text-base tabular-nums">
                    {count}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAdjustFilling(filling, 1)}
                    className="w-9 h-9 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 flex items-center justify-center text-white font-bold transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Rellenos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
