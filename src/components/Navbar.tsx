import React from 'react';
import { ShoppingBag, Lock, UtensilsCrossed, Building2, Instagram, Phone } from 'lucide-react';
import { AppSettings } from '../types';
import { formatRD } from '../lib/pricing';

interface NavbarProps {
  settings: AppSettings;
  activeMode: 'retail' | 'wholesale';
  setActiveMode: (mode: 'retail' | 'wholesale') => void;
  cartUnits: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeMode,
  setActiveMode,
  cartUnits,
  cartTotal,
  onOpenCart,
  onOpenAdmin,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#A61B1B] text-white shadow-md transition-colors border-b border-[#7A0F0F]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.brand_name}
              className="w-10 h-10 object-contain rounded-full bg-white p-1 border border-[#F2B705]"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#F2B705] text-[#7A0F0F] flex items-center justify-center font-bold text-xl shadow-sm border border-amber-300">
              N
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-white">
              {settings.brand_name}
            </span>
            <span className="font-script text-amber-200 text-sm sm:text-base leading-none tracking-wide -mt-0.5">
              {settings.brand_slogan}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Mode Switch */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="bg-[#7A0F0F] p-1 rounded-xl flex items-center border border-red-900/50">
            <button
              onClick={() => setActiveMode('retail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeMode === 'retail'
                  ? 'bg-[#F2B705] text-[#7A0F0F] shadow-sm font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Combos</span> Detalle
            </button>
            <button
              onClick={() => setActiveMode('wholesale')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeMode === 'wholesale'
                  ? 'bg-[#F2B705] text-[#7A0F0F] shadow-sm font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Mayorista
            </button>
          </div>

          <a
            href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Instagram @${settings.instagram}`}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/90 hover:text-amber-200 transition-colors"
          >
            <Instagram className="w-4 h-4" />
            <span className="font-medium">@{settings.instagram.replace('@', '')}</span>
          </a>
        </div>

        {/* Zone 3: Primary Actions (Cart Drawer & Admin Lock) */}
        <div className="flex items-center gap-2">
          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center gap-2 bg-[#F2B705] hover:bg-[#e0a800] active:scale-95 text-[#7A0F0F] px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all whitespace-nowrap cursor-pointer"
            aria-label="Ver combo"
          >
            <ShoppingBag className="w-4 h-4 text-[#7A0F0F]" />
            <span className="hidden sm:inline">Mi Pedido</span>
            <span className="bg-[#A61B1B] text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full min-w-5 text-center">
              {cartUnits}
            </span>
            {cartTotal > 0 && (
              <span className="hidden lg:inline text-xs text-amber-950/90 font-semibold border-l border-amber-900/20 pl-2">
                {formatRD(cartTotal)}
              </span>
            )}
          </button>

          {/* Admin Panel Button */}
          <button
            onClick={onOpenAdmin}
            title="Panel de Administración"
            className="p-2 text-white/80 hover:text-white hover:bg-black/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Panel de Administración"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
