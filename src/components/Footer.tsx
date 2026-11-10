import React from 'react';
import { AppSettings } from '../types';
import { MapPin, Mail, Phone, Instagram, Lock, Heart } from 'lucide-react';

interface FooterProps {
  settings: AppSettings;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onOpenAdmin }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-12 pb-20 sm:pb-12 px-4 border-t border-stone-800">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Brand Info */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F2B705] text-[#7A0F0F] flex items-center justify-center font-extrabold text-lg">
              N
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-tight">
                {settings.brand_name}
              </span>
              <span className="font-script text-amber-300 text-sm leading-none block">
                {settings.brand_slogan}
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
            Especialistas en picaderas criollas dominicanas frescas para bodas, cumpleaños, eventos corporativos y reuniones familiares. Sabor auténtico con ingredientes de primera.
          </p>

          <div className="flex items-center gap-3 pt-1">
            <a
              href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-[#A61B1B] text-white flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-[#25D366] text-white flex items-center justify-center transition-colors"
              aria-label="WhatsApp"
            >
              <Phone className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Location & Contact Info */}
        <div className="md:col-span-4 space-y-3">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
            Ubicación & Contacto
          </h4>

          <div className="space-y-2 text-xs text-stone-400">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#F2B705] shrink-0 mt-0.5" />
              <span>{settings.address}</span>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#F2B705] shrink-0" />
              <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                {settings.email}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#F2B705] shrink-0" />
              <span>1809-873-3960 (Atención al cliente & WhatsApp)</span>
            </div>
          </div>
        </div>

        {/* Ordering Hours & Policies */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
            Horarios & Envíos
          </h4>
          <p className="text-xs text-stone-400 leading-relaxed">
            • <strong>Anticipación mínima:</strong> 24 horas.<br />
            • <strong>Pedidos mayoristas:</strong> Confirmar antes de 3:00 PM.<br />
            • <strong>Cobertura:</strong> Bajos de Haina, San Cristóbal y Santo Domingo.
          </p>

          <div className="pt-2">
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-300 text-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso Administrador</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-stone-800 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Nill Food - Comida Criolla. Todos los derechos reservados.</span>
        <span className="flex items-center gap-1">
          Hecho con <Heart className="w-3 h-3 text-[#A61B1B] fill-[#A61B1B]" /> en República Dominicana
        </span>
      </div>
    </footer>
  );
};
