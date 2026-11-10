import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { formatRD } from '../lib/pricing';

interface StickyBottomBarProps {
  cartUnits: number;
  cartTotal: number;
  hasUnconfirmedPrices: boolean;
  onOpenCart: () => void;
  isWholesaleMode: boolean;
}

export const StickyBottomBar: React.FC<StickyBottomBarProps> = ({
  cartUnits,
  cartTotal,
  hasUnconfirmedPrices,
  onOpenCart,
  isWholesaleMode,
}) => {
  if (cartUnits <= 0) return null;

  return (
    <aside
      aria-label="Resumen flotante del pedido"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9F6]/95 backdrop-blur-md border-t border-[#A61B1B]/20 shadow-lg px-4 py-2.5 sm:hidden transition-transform animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#A61B1B] text-white text-[11px] font-extrabold px-1.5 py-0.2 rounded-md">
              {cartUnits} uds
            </span>
            <span className="text-xs text-stone-500 font-medium">
              {isWholesaleMode ? 'Mayorista' : 'Total combo'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-extrabold text-[#7A0F0F]">
              {formatRD(cartTotal)}
            </span>
            {hasUnconfirmedPrices && (
              <span className="text-[10px] text-amber-700 font-semibold">
                (+ conf.)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onOpenCart}
          className="flex-1 max-w-[190px] h-11 bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#F2B705]" />
          <span>Ver & Pedir</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
