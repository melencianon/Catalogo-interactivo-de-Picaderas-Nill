import React from 'react';
import { Sparkles, Star, Flame, RotateCcw, HelpCircle } from 'lucide-react';
import { AppSettings } from '../types';
import { formatRD } from '../lib/pricing';

interface HeroSectionProps {
  settings: AppSettings;
  onAddSpecialCombo: () => void;
  onSurpriseMe: () => void;
  onResetCombo: () => void;
  hasItems: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  onAddSpecialCombo,
  onSurpriseMe,
  onResetCombo,
  hasItems,
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#A61B1B] via-[#8c1414] to-[#FFF9F6] text-white pt-6 pb-8 px-4">
      {/* Decorative backdrop glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#F2B705]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-10 left-0 w-80 h-80 bg-[#1F4E4F]/20 rounded-full blur-3xl pointer-events-none -ml-20" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-medium text-amber-200">
              <Flame className="w-3.5 h-3.5 text-[#F2B705]" />
              <span>Simulador Oficial para Instagram @{settings.instagram.replace('@', '')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Arma tu picadera criolla a tu gusto.{' '}
              <span className="font-script text-3xl sm:text-4xl lg:text-5xl block text-[#F2B705] font-normal mt-1">
                ¡Fresco, crujiente y en su punto!
              </span>
            </h1>

            <p className="text-sm sm:text-base text-amber-50/90 max-w-xl font-normal leading-relaxed">
              Elige por unidad, media docena o docena completa. Cotiza al instante en RD$ y envía tu pedido directo a nuestro WhatsApp sin intermediarios.
            </p>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5 items-center">
              {/* Combo Compartido Especial CTA */}
              <button
                onClick={onAddSpecialCombo}
                className="group relative inline-flex items-center gap-2 bg-[#F2B705] hover:bg-[#e6ab00] active:scale-95 text-[#7A0F0F] font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-lg transition-all border border-amber-300 cursor-pointer"
              >
                <Star className="w-4 h-4 fill-[#7A0F0F] text-[#7A0F0F]" />
                <span>Combo Compartido Especial</span>
                <span className="bg-[#7A0F0F] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                  {formatRD(settings.special_combo_price)}
                </span>
              </button>

              {/* Sorpréndeme */}
              <button
                onClick={onSurpriseMe}
                className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-3 rounded-xl backdrop-blur-xs border border-white/25 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#F2B705]" />
                <span>Sorpréndeme</span>
              </button>

              {/* Reset Combo if active */}
              {hasItems && (
                <button
                  onClick={onResetCombo}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-white px-2.5 py-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Reiniciar todo el combo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              )}
            </div>

            {/* Micro info note */}
            <p className="text-[11px] text-amber-100/70 pt-1">
              ✨ Combo Compartido: ½ docena de quipes, pastelitos, croquetas y bolas de yuca (24 picaderas).
            </p>
          </div>

          {/* Right Column: Hero Visual Platter Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-stone-900 group">
              <img
                src="/src/assets/images/nill_food_hero_spread_1790648569684.jpg"
                alt="Banquete de Picaderas Dominicanas Nill Food"
                className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                <span className="text-xs font-semibold text-[#F2B705] uppercase tracking-wider">
                  Calidad Artesanal Casera
                </span>
                <p className="text-white font-bold text-sm sm:text-base leading-tight">
                  Quipes de res, pastelitos hojaldrados, croquetas y empanadas criollas
                </p>
                <span className="text-[11px] text-stone-300 mt-1">
                  Pedidos con mínimo 24h de anticipación · Bajos de Haina & Santo Domingo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
