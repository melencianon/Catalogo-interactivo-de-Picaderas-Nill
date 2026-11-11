import React, { useState, useEffect } from 'react';
import { Product, AppSettings, ComboSize, SalesModality, PriceMode, OrderHistoryItem } from '../types';
import {
  uploadProductImage,
  saveStoredSupabaseConfig,
  getStoredSupabaseConfig,
  SUPABASE_SQL_SCHEMA,
  deleteProductFromCloud,
  clearDeletedProductsRecord,
  unmarkProductAsDeleted,
  getDeletedProductIds,
} from '../lib/supabase';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_COMBO_SIZES, INITIAL_SETTINGS } from '../data/initialData';
import { formatRD } from '../lib/pricing';
import { getOrderHistory, removeOrderFromHistory, clearAllOrderHistory, updateOrderInHistory } from '../lib/orderHistory';
import {
  X,
  Lock,
  LogOut,
  Save,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Check,
  RotateCcw,
  Database,
  Layers,
  Phone,
  BookOpen,
  Copy,
  AlertTriangle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  ArchiveRestore,
  Clock,
  Receipt,
  Search,
  FileText,
  MessageCircle,
  UserCheck,
  Send,
  ArrowRight,
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  comboSizes: ComboSize[];
  settings: AppSettings;
  onSaveProducts: (products: Product[]) => void;
  onSaveCategories: (categories: string[]) => void;
  onSaveComboSizes: (sizes: ComboSize[]) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onRestoreDefaults: () => void;
  isOnline: boolean;
  statusMessage?: string;
  onRefreshData: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  comboSizes,
  settings,
  onSaveProducts,
  onSaveCategories,
  onSaveComboSizes,
  onSaveSettings,
  onRestoreDefaults,
  isOnline,
  statusMessage,
  onRefreshData,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('nillfood20@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active Tab
  type AdminTab = 'products' | 'categories' | 'combos' | 'settings' | 'orders' | 'supabase';
  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  // Orders history state for admin
  const [adminOrderHistory, setAdminOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminSelectedOrder, setAdminSelectedOrder] = useState<OrderHistoryItem | null>(null);
  const [adminCopiedSerial, setAdminCopiedSerial] = useState<string | null>(null);

  // Quoting Order State
  const [quotingOrder, setQuotingOrder] = useState<OrderHistoryItem | null>(null);
  const [quotePrices, setQuotePrices] = useState<Record<string, number>>({});

  const handleOpenQuoteModal = (order: OrderHistoryItem) => {
    setQuotingOrder(order);
    if (order.quotePrices) {
      setQuotePrices({ ...order.quotePrices });
    } else {
      setQuotePrices({});
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAdminOrderHistory(getOrderHistory());
    }
  }, [isOpen]);

  // Local Editable Copies
  const [editableProducts, setEditableProducts] = useState<Product[]>(products);
  const [editableCategories, setEditableCategories] = useState<string[]>(categories);
  const [editableComboSizes, setEditableComboSizes] = useState<ComboSize[]>(comboSizes);
  const [editableSettings, setEditableSettings] = useState<AppSettings>(settings);

  // Synchronize state when parent props change
  useEffect(() => {
    setEditableProducts(products);
  }, [products]);

  useEffect(() => {
    setEditableCategories(categories);
  }, [categories]);

  useEffect(() => {
    setEditableComboSizes(comboSizes);
  }, [comboSizes]);

  useEffect(() => {
    setEditableSettings(settings);
  }, [settings]);

  // Modal Product Editor
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [tempFillingsInput, setTempFillingsInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // In-app interactive confirmation dialog state (replaces window.confirm blocked in iframes)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // In-app category modal (replaces window.prompt)
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    originalName?: string;
    value: string;
  } | null>(null);

  // Toggle for deleted products trash / restoration panel
  const [showDeletedPanel, setShowDeletedPanel] = useState<boolean>(false);

  // Notifications
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Supabase Config Form
  const currentSupabase = getStoredSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentSupabase.url);
  const [sbKey, setSbKey] = useState(currentSupabase.anonKey);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin credentials (accessible by business owner)
    // Email: nillfood20@gmail.com or admin
    // Password: admin123 or nillfood2026
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPass = authPassword.trim();

    if (
      (cleanEmail === 'nillfood20@gmail.com' || cleanEmail === 'admin@nillfood.com' || cleanEmail === 'admin') &&
      (cleanPass === 'admin123' || cleanPass === 'nillfood2026' || cleanPass === 'picaderas')
    ) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Correo o contraseña incorrectos. (Demo: nillfood20@gmail.com / admin123)');
    }
  };

  // Product Editing Handlers
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setTempFillingsInput(prod.fillings ? prod.fillings.join(', ') : '');
    setImagePreview(prod.image_url);
    setIsCreatingProduct(false);
  };

  const handleOpenNewProduct = () => {
    const newProd: Product = {
      id: `picadera-${Date.now()}`,
      name: '',
      description: '',
      category: editableCategories[0] || 'Picaderas fritas',
      emoji: '🥟',
      image_url: null,
      price_dozen: 420,
      price_half: 210,
      price_unit: 35,
      price_mode: 'auto',
      sales_modality: 'todas',
      available: true,
      fillings: [],
      wholesale_unit_price: 35,
      wholesale_batch_price: 1500,
    };
    setEditingProduct(newProd);
    setTempFillingsInput('');
    setImagePreview(null);
    setIsCreatingProduct(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    try {
      setUploadingImage(true);
      const uploadedUrl = await uploadProductImage(file);
      setImagePreview(uploadedUrl);
      setEditingProduct({
        ...editingProduct,
        image_url: uploadedUrl,
      });
    } catch (err) {
      alert('Error procesando o comprimiendo imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEditingProduct = () => {
    if (!editingProduct) return;
    if (!editingProduct.name.trim()) {
      alert('El nombre del producto no puede estar vacío');
      return;
    }

    // Parse fillings comma-separated list
    const parsedFillings = tempFillingsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const finalProduct: Product = {
      ...editingProduct,
      name: editingProduct.name.trim(),
      fillings: parsedFillings,
    };

    let updatedList: Product[];
    if (isCreatingProduct) {
      updatedList = [finalProduct, ...editableProducts];
    } else {
      updatedList = editableProducts.map((p) => (p.id === finalProduct.id ? finalProduct : p));
    }

    setEditableProducts(updatedList);
    onSaveProducts(updatedList);
    setEditingProduct(null);
    showToast('Producto guardado correctamente');
  };

  // Custom In-App Deletion and Restoration Handlers
  const requestDeleteProduct = (productId: string, productName?: string) => {
    const prod = editableProducts.find((p) => p.id === productId);
    const displayName = productName || prod?.name || 'esta picadera';
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar picadera del catálogo?',
      message: `¿Estás seguro de que deseas eliminar "${displayName}"? Se quitará del catálogo visible para los clientes. Podrás restaurarla en cualquier momento desde la sección de Picaderas Eliminadas.`,
      confirmLabel: 'Sí, eliminar picadera',
      isDestructive: true,
      onConfirm: async () => {
        await deleteProductFromCloud(productId);
        const updated = editableProducts.filter((p) => p.id !== productId);
        setEditableProducts(updated);
        onSaveProducts(updated);
        setConfirmModal(null);
        showToast(`"${displayName}" eliminada correctamente`);
      },
    });
  };

  // Restore individual deleted product
  const handleRestoreSingleProduct = async (productToRestore: Product) => {
    unmarkProductAsDeleted(productToRestore.id);
    const updated = [...editableProducts, productToRestore];
    setEditableProducts(updated);
    onSaveProducts(updated);
    showToast(`"${productToRestore.name}" ha sido restaurada con éxito`);
  };

  // Restore all deleted products from factory baseline
  const handleRestoreAllDeletedProducts = async () => {
    const missing = INITIAL_PRODUCTS.filter((ip) => !editableProducts.some((ep) => ep.id === ip.id));
    clearDeletedProductsRecord();
    const updated = [...editableProducts, ...missing];
    setEditableProducts(updated);
    onSaveProducts(updated);
    showToast(`¡${missing.length} picaderas restauradas al catálogo!`);
  };

  // Request Restore Defaults with custom in-app confirmation
  const requestRestoreDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: '¿Restaurar catálogo criollo de fábrica?',
      message: 'Esta acción restablecerá todas las picaderas criollas originales, categorías de fábrica, combos y ajustes iniciales de Nill Food. Las picaderas eliminadas volverán a estar activas.',
      confirmLabel: 'Sí, restaurar todo de fábrica',
      isDestructive: false,
      onConfirm: async () => {
        clearDeletedProductsRecord();
        setEditableProducts(INITIAL_PRODUCTS);
        setEditableCategories(INITIAL_CATEGORIES);
        setEditableComboSizes(INITIAL_COMBO_SIZES);
        setEditableSettings(INITIAL_SETTINGS);
        await onRestoreDefaults();
        setConfirmModal(null);
        showToast('¡Catálogo restaurado a los datos originales con éxito!');
      },
    });
  };

  const handleToggleAvailability = (productId: string) => {
    const updated = editableProducts.map((p) =>
      p.id === productId ? { ...p, available: !p.available } : p
    );
    setEditableProducts(updated);
    onSaveProducts(updated);
  };

  // Category Handlers using custom in-app modal
  const handleOpenAddCategory = () => {
    setCategoryModal({
      isOpen: true,
      mode: 'create',
      value: '',
    });
  };

  const handleOpenEditCategory = (cat: string) => {
    setCategoryModal({
      isOpen: true,
      mode: 'edit',
      originalName: cat,
      value: cat,
    });
  };

  const handleSaveCategoryModal = () => {
    if (!categoryModal) return;
    const clean = categoryModal.value.trim();
    if (!clean) return;

    if (categoryModal.mode === 'create') {
      if (!editableCategories.includes(clean)) {
        const next = [...editableCategories, clean];
        setEditableCategories(next);
        onSaveCategories(next);
        showToast('Categoría creada exitosamente');
      }
    } else if (categoryModal.mode === 'edit' && categoryModal.originalName) {
      const orig = categoryModal.originalName;
      if (clean !== orig) {
        const next = editableCategories.map((c) => (c === orig ? clean : c));
        setEditableCategories(next);
        onSaveCategories(next);
        // Also update products with this category
        const updatedProds = editableProducts.map((p) =>
          p.category === orig ? { ...p, category: clean } : p
        );
        setEditableProducts(updatedProds);
        onSaveProducts(updatedProds);
        showToast('Categoría renombrada');
      }
    }
    setCategoryModal(null);
  };

  const requestDeleteCategory = (cat: string) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar categoría "${cat}"?`,
      message: `Los productos asignados a esta categoría mantendrán su nombre y precio, pero la categoría ya no se mostrará como filtro.`,
      confirmLabel: 'Sí, eliminar categoría',
      isDestructive: true,
      onConfirm: () => {
        const next = editableCategories.filter((c) => c !== cat);
        setEditableCategories(next);
        onSaveCategories(next);
        setConfirmModal(null);
        showToast('Categoría eliminada');
      },
    });
  };

  // Save Settings
  const handleSaveSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(editableSettings);
    onSaveComboSizes(editableComboSizes);
    showToast('Ajustes guardados exitosamente');
  };

  // Save Supabase Keys
  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSupabaseConfig({ url: sbUrl.trim(), anonKey: sbKey.trim() });
    onRefreshData();
    showToast('Configuración de Supabase guardada. Reconectando...');
  };

  const showToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-4xl h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-stone-100">
        {/* Top Header */}
        <div className="bg-[#1F4E4F] text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2B705] text-[#1F4E4F] flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight">
                Panel de Administración Nill Food
              </h2>
              <span className="text-xs text-teal-200 font-medium">
                {isOnline ? '🟢 Sincronizado en la Nube (Supabase)' : '🟠 Modo Local Activo'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsAuthenticated(false)}
                className="text-xs text-teal-200 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 flex items-center gap-1 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Toast Notification */}
        {saveSuccessMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-200">
            <Check className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Content Body */}
        {!isAuthenticated ? (
          /* Login Screen */
          <div className="flex-1 flex items-center justify-center p-6 bg-[#FFF9F6]">
            <form onSubmit={handleLogin} className="max-w-sm w-full bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-stone-200/80 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF3EE] text-[#A61B1B] mx-auto flex items-center justify-center font-bold">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg text-stone-900">
                  Acceso Administrativo
                </h3>
                <p className="text-xs text-stone-500">
                  Solo el personal autorizado de Nill Food puede editar precios y catálogo.
                </p>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E4F]/20 focus:border-[#1F4E4F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E4F]/20 focus:border-[#1F4E4F] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1F4E4F] hover:bg-[#163839] active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
              >
                Entrar al Panel
              </button>

              <div className="text-[11px] text-center text-stone-400 pt-2">
                Clave inicial de demo: <strong className="text-stone-700">admin123</strong>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Tabs */}
            <aside className="w-full md:w-56 bg-stone-50 border-r border-stone-200 p-2 sm:p-3 flex md:flex-col gap-1 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'products'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Picaderas ({editableProducts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Edit2 className="w-4 h-4" />
                <span>Categorías ({editableCategories.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('combos')}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'combos'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Tamaños Combos</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Ajustes & WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  setAdminOrderHistory(getOrderHistory());
                  setActiveTab('orders');
                }}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-300" />
                  <span>Historial & Cotizaciones</span>
                </div>
                {adminOrderHistory.filter((o) => (o.hasUnconfirmed || (o.customPicaderas && o.customPicaderas.length > 0)) && o.orderStatus !== 'cotizada').length > 0 ? (
                  <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                    {adminOrderHistory.filter((o) => (o.hasUnconfirmed || (o.customPicaderas && o.customPicaderas.length > 0)) && o.orderStatus !== 'cotizada').length} pend.
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-400 font-semibold">
                    ({adminOrderHistory.length})
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('supabase')}
                className={`flex-1 md:flex-none text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'supabase'
                    ? 'bg-[#1F4E4F] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Base de Datos & Guía</span>
              </button>

              {/* Restore original button */}
              <div className="pt-2 md:pt-4 md:mt-auto">
                <button
                  type="button"
                  onClick={requestRestoreDefaults}
                  className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-semibold text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer border border-red-200/50 md:border-transparent"
                  title="Restaurar todo el catálogo de picaderas a valores de fábrica"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar de fábrica</span>
                </button>
              </div>
            </aside>

            {/* Tab Panels */}
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-white">
              {/* TAB 1: PRODUCTS MANAGER */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-lg">
                        Catálogo de Picaderas y Precios
                      </h3>
                      <p className="text-xs text-stone-500">
                        Configura precios por unidad, media docena y docena, y añade fotos comprimidas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenNewProduct}
                      className="px-4 py-2.5 bg-[#A61B1B] hover:bg-[#8e1515] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Picadera</span>
                    </button>
                  </div>

                  {/* PICADERAS ELIMINADAS / PAPELERA DE RESTAURACIÓN */}
                  {(() => {
                    const deletedFromDefaults = INITIAL_PRODUCTS.filter(
                      (ip) => !editableProducts.some((ep) => ep.id === ip.id)
                    );
                    if (deletedFromDefaults.length === 0) return null;
                    return (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">♻️</span>
                            <div>
                              <h4 className="text-xs font-bold text-amber-900 leading-tight">
                                {deletedFromDefaults.length} {deletedFromDefaults.length === 1 ? 'picadera eliminada disponible' : 'picaderas eliminadas disponibles'} para restaurar
                              </h4>
                              <p className="text-[11px] text-amber-700/80">
                                Puedes recuperarlas individualmente o restaurar todo el menú.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setShowDeletedPanel(!showDeletedPanel)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                            >
                              {showDeletedPanel ? 'Ocultar papelera' : 'Ver y restaurar'}
                            </button>
                            <button
                              type="button"
                              onClick={handleRestoreAllDeletedProducts}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restaurar todas</span>
                            </button>
                          </div>
                        </div>

                        {showDeletedPanel && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 max-h-56 overflow-y-auto">
                            {deletedFromDefaults.map((del) => (
                              <div
                                key={del.id}
                                className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {del.image_url ? (
                                    <img
                                      src={del.image_url}
                                      alt={del.name}
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200"
                                    />
                                  ) : (
                                    <span className="text-xl shrink-0">{del.emoji}</span>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-stone-900 text-xs truncate block">
                                      {del.name}
                                    </span>
                                    <span className="text-[10px] text-stone-500 block truncate">
                                      {del.category} · Doc: {del.price_dozen ? formatRD(del.price_dozen) : 'Auto'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreSingleProduct(del)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs"
                                  title={`Restaurar ${del.name} al catálogo`}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Restaurar</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Products Table/List */}
                  <div className="space-y-2.5">
                    {editableProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3.5 rounded-2xl border border-stone-200 hover:border-stone-300 bg-stone-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#FFF3EE] flex items-center justify-center text-2xl shrink-0">
                              {prod.emoji}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-stone-900 text-sm">
                                {prod.name}
                              </h4>
                              {!prod.available && (
                                <span className="bg-stone-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                                  Agotado
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500">
                              {prod.category} ·{' '}
                              <strong className="text-[#A61B1B]">
                                Docena: {prod.price_dozen !== null ? formatRD(prod.price_dozen) : 'Por confirmar'}
                              </strong>
                              {' · '}
                              ½ Doc: {prod.price_half !== null ? formatRD(prod.price_half) : 'Auto'}
                              {' · '}
                              Unidad: {prod.price_unit !== null ? formatRD(prod.price_unit) : 'Auto'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          {/* Availability toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(prod.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                              prod.available
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                            title="Cambiar estado agotado / disponible"
                          >
                            {prod.available ? 'Disponible' : 'Agotado'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditProduct(prod)}
                            className="p-2 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-stone-800 transition-colors cursor-pointer"
                            title="Editar picadera"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => requestDeleteProduct(prod.id, prod.name)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                            title="Eliminar picadera del catálogo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CATEGORIES */}
              {activeTab === 'categories' && (
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-lg">
                        Categorías del Catálogo
                      </h3>
                      <p className="text-xs text-stone-500">
                        Crea, renombra o elimina las secciones mostradas en la app.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="px-3.5 py-2 bg-[#1F4E4F] hover:bg-[#163839] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Categoría</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {editableCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50"
                      >
                        <span className="font-bold text-stone-800 text-sm">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-md cursor-pointer hover:bg-stone-200 transition-colors"
                            title="Renombrar categoría"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteCategory(cat)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-md cursor-pointer hover:bg-red-50 transition-colors"
                            title="Eliminar categoría"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COMBO SIZES */}
              {activeTab === 'combos' && (
                <div className="space-y-4 max-w-xl">
                  <div className="pb-3 border-b border-stone-200">
                    <h3 className="font-extrabold text-stone-900 text-lg">
                      Tamaños de Combos y Límites de Unidades
                    </h3>
                    <p className="text-xs text-stone-500">
                      Edita el número de picaderas permitidas para cada tamaño del simulador.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {editableComboSizes.map((size, idx) => (
                      <div
                        key={size.id}
                        className="p-4 rounded-2xl border border-stone-200 bg-stone-50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900 text-sm">
                            {size.name}
                          </span>
                          <span className="text-xs font-semibold text-[#A61B1B]">
                            {size.units !== null ? `${size.units} unidades` : 'Sin límite (Libre)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-stone-600 mb-1">
                              Límite de Unidades (vacío = Sin límite)
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Ej: 24"
                              value={size.units ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                const updated = [...editableComboSizes];
                                updated[idx] = {
                                  ...size,
                                  units: val,
                                  tag: val !== null ? `${val} uds` : 'Sin límite',
                                };
                                setEditableComboSizes(updated);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-600 mb-1">
                              Recomendación / Subtítulo
                            </label>
                            <input
                              type="text"
                              value={size.recommendedFor}
                              onChange={(e) => {
                                const updated = [...editableComboSizes];
                                updated[idx] = { ...size, recommendedFor: e.target.value };
                                setEditableComboSizes(updated);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* CONFIGURACIÓN DE LA TARJETA "A TU MEDIDA" */}
                    <div className="p-4 rounded-2xl border-2 border-dashed border-[#A61B1B]/30 bg-[#FFF9F6] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎯</span>
                          <div>
                            <h4 className="font-bold text-stone-900 text-sm">
                              Tarjeta "A tu medida" (Unidades personalizadas)
                            </h4>
                            <p className="text-[11px] text-stone-500">
                              Permite al cliente definir cuántas picaderas desea y repartirlas libremente.
                            </p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editableSettings.custom_combo_enabled !== false}
                            onChange={(e) =>
                              setEditableSettings({
                                ...editableSettings,
                                custom_combo_enabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-[#A61B1B] rounded focus:ring-[#A61B1B]"
                          />
                          <span className="text-xs font-bold text-stone-800">
                            {editableSettings.custom_combo_enabled !== false ? 'Activa' : 'Desactivada'}
                          </span>
                        </label>
                      </div>

                      {editableSettings.custom_combo_enabled !== false && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div>
                            <label className="block text-stone-600 mb-1 font-semibold">
                              Nombre de la tarjeta
                            </label>
                            <input
                              type="text"
                              value={editableSettings.custom_combo_name || 'A tu medida'}
                              onChange={(e) =>
                                setEditableSettings({
                                  ...editableSettings,
                                  custom_combo_name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-600 mb-1 font-semibold">
                              Etiqueta superior
                            </label>
                            <input
                              type="text"
                              value={editableSettings.custom_combo_tag || 'Tú eliges las unidades'}
                              onChange={(e) =>
                                setEditableSettings({
                                  ...editableSettings,
                                  custom_combo_tag: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-stone-600 mb-1 font-semibold">
                              Descripción / Recomendación
                            </label>
                            <input
                              type="text"
                              value={
                                editableSettings.custom_combo_description ||
                                'Personaliza la cantidad exacta'
                              }
                              onChange={(e) =>
                                setEditableSettings({
                                  ...editableSettings,
                                  custom_combo_description: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-600 mb-1 font-semibold">
                              Mínimo de unidades permitidas
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editableSettings.custom_combo_min ?? 6}
                              onChange={(e) =>
                                setEditableSettings({
                                  ...editableSettings,
                                  custom_combo_min: parseInt(e.target.value, 10) || 6,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-600 mb-1 font-semibold">
                              Máximo de unidades permitidas
                            </label>
                            <input
                              type="number"
                              min="10"
                              value={editableSettings.custom_combo_max ?? 200}
                              onChange={(e) =>
                                setEditableSettings({
                                  ...editableSettings,
                                  custom_combo_max: parseInt(e.target.value, 10) || 200,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSaveComboSizes(editableComboSizes);
                        onSaveSettings(editableSettings);
                        showToast('Tamaños de combo y tarjeta A tu medida guardados');
                      }}
                      className="px-5 py-2.5 bg-[#1F4E4F] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Tamaños de Combo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: SETTINGS & WHATSAPP */}
              {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettingsSubmit} className="space-y-4 max-w-xl">
                  <div className="pb-3 border-b border-stone-200">
                    <h3 className="font-extrabold text-stone-900 text-lg">
                      Ajustes del Negocio & Pedidos
                    </h3>
                    <p className="text-xs text-stone-500">
                      Modifica el teléfono de WhatsApp, precio del Combo Compartido y datos de marca.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Teléfono de WhatsApp (con código de país)
                      </label>
                      <input
                        type="text"
                        value={editableSettings.whatsapp_number}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, whatsapp_number: e.target.value })
                        }
                        placeholder="18098733960"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Precio Combo Compartido Especial (RD$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editableSettings.special_combo_price}
                        onChange={(e) =>
                          setEditableSettings({
                            ...editableSettings,
                            special_combo_price: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="750"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold text-[#A61B1B]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Usuario de Instagram
                      </label>
                      <input
                        type="text"
                        value={editableSettings.instagram}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, instagram: e.target.value })
                        }
                        placeholder="nill_food20"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">
                        Correo de Contacto
                      </label>
                      <input
                        type="email"
                        value={editableSettings.email}
                        onChange={(e) =>
                          setEditableSettings({ ...editableSettings, email: e.target.value })
                        }
                        placeholder="nillfood20@gmail.com"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Dirección Física (Pie de Página)
                    </label>
                    <input
                      type="text"
                      value={editableSettings.address}
                      onChange={(e) =>
                        setEditableSettings({ ...editableSettings, address: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                    />
                  </div>

                  {/* Logo Image Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Logo del Negocio
                    </label>
                    <div className="flex items-center gap-3">
                      {editableSettings.logo_url && (
                        <img
                          src={editableSettings.logo_url}
                          alt="Logo Nill Food"
                          className="w-12 h-12 rounded-xl object-contain border border-stone-300 bg-white p-1"
                        />
                      )}
                      <label className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-xs font-semibold text-stone-800 cursor-pointer flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Logo desde celular o PC</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const uploaded = await uploadProductImage(file);
                              setEditableSettings({ ...editableSettings, logo_url: uploaded });
                              showToast('Logo cargado');
                            } catch {
                              alert('Error al subir logo');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#A61B1B] hover:bg-[#8e1515] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 5: ORDERS HISTORY & SERIAL NUMBERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4 max-w-4xl text-stone-800">
                  <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-[#A61B1B]" />
                        <span>Historial de Pedidos y Números de Serie</span>
                      </h3>
                      <p className="text-xs text-stone-500">
                        Registro histórico de pedidos enviados por WhatsApp con su número de serie asignado (#NF-...) para control y seguimiento.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {adminOrderHistory.some((o) => (o.hasUnconfirmed || (o.customPicaderas && o.customPicaderas.length > 0))) && (
                        <button
                          type="button"
                          onClick={() => {
                            const pending = adminOrderHistory.find(
                              (o) => (o.hasUnconfirmed || (o.customPicaderas && o.customPicaderas.length > 0)) && o.orderStatus !== 'cotizada'
                            ) || adminOrderHistory[0];
                            if (pending) {
                              setQuotingOrder(pending);
                              setQuotePrices({});
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Abrir cotizador de picaderas"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Cotizar Pedido</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setAdminOrderHistory(getOrderHistory())}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Refrescar historial"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Actualizar</span>
                      </button>

                      {adminOrderHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: '¿Vaciar historial de pedidos?',
                              message: 'Esta acción borrará todos los registros históricos guardados localmente.',
                              confirmLabel: 'Sí, vaciar historial',
                              isDestructive: true,
                              onConfirm: () => {
                                clearAllOrderHistory();
                                setAdminOrderHistory([]);
                                setAdminSelectedOrder(null);
                                setConfirmModal(null);
                              },
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Vaciar historial</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar pedido por número de serie (#NF-...), nombre de cliente, dirección o producto..."
                      value={adminOrderSearch}
                      onChange={(e) => setAdminOrderSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F4E4F]/20"
                    />
                  </div>

                  {/* Orders List */}
                  {(() => {
                    const term = adminOrderSearch.trim().toLowerCase();
                    const filtered = adminOrderHistory.filter((ord) => {
                      if (!term) return true;
                      return (
                        ord.serialNumber.toLowerCase().includes(term) ||
                        ord.customerName.toLowerCase().includes(term) ||
                        (ord.deliveryAddress && ord.deliveryAddress.toLowerCase().includes(term)) ||
                        ord.items.some((i) => i.name.toLowerCase().includes(term)) ||
                        (ord.customPicaderas && ord.customPicaderas.some((cp) => (typeof cp === 'string' ? cp : cp.name).toLowerCase().includes(term)))
                      );
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-16 space-y-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                          <div className="w-14 h-14 rounded-2xl bg-[#FFF3EE] text-[#A61B1B] flex items-center justify-center mx-auto">
                            <Receipt className="w-7 h-7" />
                          </div>
                          <h4 className="font-bold text-stone-800 text-sm">
                            {adminOrderHistory.length === 0
                              ? 'No hay pedidos en el historial todavía'
                              : 'No se encontraron pedidos con ese término'}
                          </h4>
                          <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            {adminOrderHistory.length === 0
                              ? 'Cuando un cliente o tú completen un pedido por WhatsApp, quedará guardado con su número de serie, detalle de productos y monto total.'
                              : 'Intenta buscar con otro número de serie, nombre o palabra clave.'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3.5">
                        {filtered.map((ord) => {
                          const isViewingMessage = adminSelectedOrder?.serialNumber === ord.serialNumber;
                          const formattedDate = new Date(ord.createdAt).toLocaleDateString('es-DO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <div
                              key={ord.serialNumber}
                              className="bg-white rounded-2xl border border-stone-200 hover:border-stone-300 p-4 space-y-3 shadow-2xs transition-all"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs sm:text-sm text-[#7A0F0F] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <Receipt className="w-3.5 h-3.5 text-[#A61B1B]" />
                                    #{ord.serialNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(ord.serialNumber);
                                      setAdminCopiedSerial(ord.serialNumber);
                                      setTimeout(() => setAdminCopiedSerial(null), 2000);
                                    }}
                                    className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                                    title="Copiar número de serie"
                                  >
                                    {adminCopiedSerial === ord.serialNumber ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span className="text-[10px] bg-stone-100 text-stone-600 font-semibold px-2 py-0.5 rounded-md">
                                    {ord.comboTypeLabel}
                                  </span>
                                  {ord.orderStatus && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                      ord.orderStatus === 'confirmada' || ord.orderStatus === 'recibida_admin'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : ord.orderStatus === 'aprobada_cliente'
                                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                                        : ord.orderStatus === 'cotizada'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}>
                                      {ord.orderStatus === 'confirmada' || ord.orderStatus === 'recibida_admin'
                                        ? '🟢 Confirmada en Cocina'
                                        : ord.orderStatus === 'aprobada_cliente'
                                        ? '🟣 Aprobada por Cliente'
                                        : ord.orderStatus === 'cotizada'
                                        ? '🔵 Cotizada (Esperando Cliente)'
                                        : '🟡 Pendiente Cotización'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-medium">
                                  <Clock className="w-3 h-3" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>

                              {/* Customer and Delivery info */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                <div>
                                  <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                                    Cliente
                                  </span>
                                  <span className="font-bold text-stone-900 block truncate">
                                    {ord.customerName}
                                  </span>
                                  {ord.customerPhone && (
                                    <span className="text-[11px] text-stone-500 font-medium block">
                                      📱 {ord.customerPhone}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                                    Modalidad de Entrega
                                  </span>
                                  <span className="font-semibold text-stone-700 block truncate">
                                    {ord.deliveryMethod === 'delivery' ? '🚚 A Domicilio' : '🏪 Retiro en Tienda'} ({ord.deliveryDateTime})
                                  </span>
                                  {ord.deliveryAddress && (
                                    <span className="text-[10px] text-stone-500 block truncate">
                                      {ord.deliveryAddress}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                                    Presentación
                                  </span>
                                  <span className="font-semibold text-stone-700 block">
                                    {ord.packagingType === 'bandeja'
                                      ? '🍽️ Bandeja'
                                      : ord.packagingType === 'caja'
                                      ? '📦 Caja Kraft'
                                      : '🥡 Individual'}
                                  </span>
                                </div>
                              </div>

                              {/* Products List */}
                              <div className="space-y-1 pt-1">
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                                  Picaderas ({ord.totalUnits} unidades)
                                </span>
                                <div className="flex flex-wrap gap-1.5 text-xs">
                                  {ord.items.map((it, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium border border-stone-200/50"
                                    >
                                      {it.units}× {it.name}
                                    </span>
                                  ))}
                                  {ord.customPicaderas && ord.customPicaderas.map((cp, idx) => (
                                    <span
                                      key={`cust-${idx}`}
                                      className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200/50"
                                    >
                                      ✨ {typeof cp === 'string' ? cp : `${cp.units}× ${cp.name}`}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Total and Savings */}
                              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-stone-400 uppercase font-bold block">
                                    Total del Pedido
                                  </span>
                                  <span className="text-base font-extrabold text-[#A61B1B]">
                                    {formatRD(ord.grandTotal)}
                                  </span>
                                </div>

                                {ord.totalSavings && ord.totalSavings > 0 && (
                                  <div className="text-right">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      Ahorro Cliente: {formatRD(ord.totalSavings)} ({ord.savingsPercent}%)
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Cotizar / Flujo de Vida del Pedido */}
                                  {(!ord.orderStatus || ord.orderStatus === 'pendiente') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuoteModal(ord)}
                                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>Cotizar Pedido</span>
                                    </button>
                                  )}

                                  {ord.orderStatus === 'cotizada' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuoteModal(ord)}
                                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>Cotizada · Ver Flujo</span>
                                    </button>
                                  )}

                                  {ord.orderStatus === 'aprobada_cliente' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuoteModal(ord)}
                                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer animate-pulse"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>¡Cliente Aprobó! · Pasar a Cocina</span>
                                    </button>
                                  )}

                                  {(ord.orderStatus === 'confirmada' || ord.orderStatus === 'recibida_admin') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenQuoteModal(ord)}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Confirmada en Cocina · Ver Flujo</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setAdminSelectedOrder(isViewingMessage ? null : ord)}
                                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>{isViewingMessage ? 'Ocultar mensaje' : 'Ver mensaje completo'}</span>
                                  </button>

                                  <a
                                    href={`https://wa.me/${(ord.customerPhone ? ord.customerPhone.replace(/\D/g, '') : settings.whatsapp_number.replace(/\D/g, ''))}?text=${encodeURIComponent(ord.fullWhatsAppMessage)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>Abrir en WhatsApp</span>
                                  </a>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = removeOrderFromHistory(ord.serialNumber);
                                    setAdminOrderHistory(updated);
                                    if (adminSelectedOrder?.serialNumber === ord.serialNumber) {
                                      setAdminSelectedOrder(null);
                                    }
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar registro"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Message preview */}
                              {isViewingMessage && (
                                <div className="mt-2 p-3 bg-stone-900 text-stone-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed border border-stone-800 select-all">
                                  {ord.fullWhatsAppMessage}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 6: SUPABASE & DEPLOYMENT GUIDE */}
              {activeTab === 'supabase' && (
                <div className="space-y-6 max-w-2xl text-stone-800">
                  <div className="pb-3 border-b border-stone-200">
                    <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#1F4E4F]" />
                      <span>Persistencia en la Nube con Supabase</span>
                    </h3>
                    <p className="text-xs text-stone-500">
                      Conecta tu proyecto gratuito de Supabase para que los clientes vean siempre el catálogo actualizado desde cualquier dispositivo.
                    </p>
                  </div>

                  {/* Connection Form */}
                  <form onSubmit={handleSaveSupabaseConfig} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                    <h4 className="font-bold text-xs text-stone-900 uppercase">
                      Credenciales de Supabase
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Project URL (ej: https://xyz.supabase.co)
                      </label>
                      <input
                        type="url"
                        placeholder="https://tu-proyecto.supabase.co"
                        value={sbUrl}
                        onChange={(e) => setSbUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Anon Public Key (anon public)
                      </label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={sbKey}
                        onChange={(e) => setSbKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-stone-500">
                        {isOnline ? '🟢 Conexión activa con Supabase' : '🟠 Trabajando en modo local (copia en caché)'}
                      </span>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#1F4E4F] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar y Conectar</span>
                      </button>
                    </div>
                  </form>

                  {/* Step-by-step non-technical tutorial */}
                  <div className="space-y-4 text-xs">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#A61B1B]" />
                      <span>Guía Paso a Paso para Configurar Supabase Gratis</span>
                    </h4>

                    <ol className="list-decimal list-inside space-y-2.5 text-stone-600 bg-[#FFF9F6] p-4 rounded-2xl border border-stone-200">
                      <li>
                        <strong>Crear cuenta en Supabase:</strong> Entra a{' '}
                        <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#A61B1B] underline font-semibold">
                          supabase.com
                        </a>{' '}
                        e inicia sesión con tu correo o GitHub (100% gratis).
                      </li>
                      <li>
                        <strong>Crear Nuevo Proyecto:</strong> Haz clic en "New Project", ponle nombre <code>NillFood</code> y una contraseña para la base de datos.
                      </li>
                      <li>
                        <strong>Copiar y Pegar el Script SQL:</strong> En el menú izquierdo de Supabase, ve a <strong>SQL Editor</strong> &gt; "New query". Pega el código de abajo y haz clic en <strong>RUN</strong>.
                      </li>
                      <li>
                        <strong>Crear Bucket para Fotos:</strong> En el menú izquierdo ve a <strong>Storage</strong> &gt; "New bucket", llámalo <code>picaderas_images</code> y activa la casilla <strong>"Public bucket"</strong>.
                      </li>
                      <li>
                        <strong>Copiar las Llaves API:</strong> Ve a <strong>Project Settings</strong> &gt; <strong>API</strong>. Copia el <code>Project URL</code> y el <code>anon public key</code> y pégalos en el formulario de arriba.
                      </li>
                    </ol>

                    {/* Copyable SQL Schema */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700 text-xs">
                          Script SQL para Supabase (Tablas y Políticas de Seguridad RLS):
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedSql ? <CheckCircle className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSql ? 'Copiado' : 'Copiar SQL'}</span>
                        </button>
                      </div>
                      <pre className="bg-stone-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-stone-800">
                        {SUPABASE_SQL_SCHEMA}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* MODAL: PRODUCT EDIT / CREATE DIALOG */}
        {editingProduct && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-stone-200">
              <div className="bg-[#A61B1B] text-white p-4 flex items-center justify-between">
                <h4 className="font-extrabold text-sm sm:text-base">
                  {isCreatingProduct ? 'Nueva Picadera' : `Editar: ${editingProduct.name}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
                {/* Image Upload with Compression */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Foto de la Picadera (Subir desde celular o PC)
                  </label>
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Vista previa"
                        className="w-16 h-16 rounded-xl object-cover border border-stone-300"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-300">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? 'Comprimiendo...' : 'Seleccionar foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                      <span className="block text-[10px] text-stone-400">
                        Se comprime automáticamente para carga rápida en celulares.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={editingProduct.category}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                    >
                      {editableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description & Emoji */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="block font-semibold text-stone-700 mb-1">
                      Descripción corta
                    </label>
                    <input
                      type="text"
                      value={editingProduct.description}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, description: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Emoji
                    </label>
                    <input
                      type="text"
                      value={editingProduct.emoji}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, emoji: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-center text-lg"
                    />
                  </div>
                </div>

                {/* SALES MODALITY */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Modalidad de Venta Permitida
                  </label>
                  <select
                    value={editingProduct.sales_modality}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sales_modality: e.target.value as SalesModality,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="todas">Todas (Por unidad, ½ docena y docena)</option>
                    <option value="solo_unidad">Solo por Unidad (ej: Jugos Fru Fru)</option>
                    <option value="solo_docena">Solo por Docena</option>
                  </select>
                </div>

                {/* PRICING ENGINE: AUTO VS MANUAL */}
                <div className="bg-[#FFF3EE] p-3 rounded-2xl border border-[#A61B1B]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">
                      Precios al Detalle (RD$)
                    </span>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-stone-200">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            price_mode: 'auto',
                            price_half: editingProduct.price_dozen ? Math.round(editingProduct.price_dozen / 2) : null,
                            price_unit: editingProduct.price_dozen ? Math.round(editingProduct.price_dozen / 12) : null,
                          })
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          editingProduct.price_mode === 'auto'
                            ? 'bg-[#A61B1B] text-white'
                            : 'text-stone-600'
                        }`}
                      >
                        Automático
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({ ...editingProduct, price_mode: 'manual' })
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          editingProduct.price_mode === 'manual'
                            ? 'bg-[#A61B1B] text-white'
                            : 'text-stone-600'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        Docena (12 uds)
                      </label>
                      <input
                        type="number"
                        placeholder="null = Por confirmar"
                        value={editingProduct.price_dozen ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          if (editingProduct.price_mode === 'auto' && val !== null) {
                            setEditingProduct({
                              ...editingProduct,
                              price_dozen: val,
                              price_half: Math.round(val / 2),
                              price_unit: Math.round(val / 12),
                            });
                          } else {
                            setEditingProduct({ ...editingProduct, price_dozen: val });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        ½ Docena (6 uds)
                      </label>
                      <input
                        type="number"
                        disabled={editingProduct.price_mode === 'auto'}
                        value={editingProduct.price_half ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          setEditingProduct({ ...editingProduct, price_half: val });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 disabled:bg-stone-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        Unidad (1 ud)
                      </label>
                      <input
                        type="number"
                        disabled={editingProduct.price_mode === 'auto'}
                        value={editingProduct.price_unit ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value);
                          setEditingProduct({ ...editingProduct, price_unit: val });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 disabled:bg-stone-100"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-500 block">
                    {editingProduct.price_mode === 'auto'
                      ? '💡 En modo automático, la unidad = docena ÷ 12 y la ½ docena = docena ÷ 2.'
                      : '✍️ En modo manual puedes cobrar la unidad o ½ docena con un margen diferente.'}
                  </span>
                </div>

                {/* WHOLESALE PRICING */}
                <div className="bg-teal-50/50 p-3 rounded-2xl border border-teal-200 space-y-2">
                  <span className="font-bold text-[#1F4E4F] block">
                    Precios Mayoristas (Mínimo 50 uds)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        Precio Unidad Mayorista (RD$)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 35"
                        value={editingProduct.wholesale_unit_price ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            wholesale_unit_price:
                              e.target.value === '' ? null : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-0.5">
                        Precio Lote de 50 (RD$)
                      </label>
                      <input
                        type="number"
                        placeholder="Ej: 1500"
                        value={editingProduct.wholesale_batch_price ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            wholesale_batch_price:
                              e.target.value === '' ? null : parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 font-bold text-[#1F4E4F]"
                      />
                    </div>
                  </div>
                </div>

                {/* FILLINGS */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Opciones de Relleno / Sabores (separados por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pollo, Queso, Salsa Pizza, Pepperoni, Maíz, Res"
                    value={tempFillingsInput}
                    onChange={(e) => setTempFillingsInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Permite a los clientes repartir las unidades entre estos rellenos.
                  </span>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                {!isCreatingProduct && editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingProduct.id;
                      const nameToDelete = editingProduct.name;
                      setEditingProduct(null);
                      requestDeleteProduct(idToDelete, nameToDelete);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Picadera</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs cursor-pointer hover:bg-stone-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditingProduct}
                    className="px-5 py-2 rounded-xl bg-[#A61B1B] hover:bg-[#8e1515] text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    Guardar Picadera
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM IN-APP CONFIRMATION DIALOG (Works in iframe without window.confirm) */}
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmModal.isDestructive
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base leading-snug">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 rounded-xl font-bold text-xs text-white shadow-xs cursor-pointer transition-colors ${
                    confirmModal.isDestructive
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#A61B1B] hover:bg-[#8e1515]'
                  }`}
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM IN-APP CATEGORY MODAL (Works in iframe without window.prompt) */}
        {categoryModal && categoryModal.isOpen && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">
                  {categoryModal.mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  {categoryModal.mode === 'create'
                    ? 'Escribe el nombre de la nueva categoría para agrupar picaderas.'
                    : `Renombrando "${categoryModal.originalName}".`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  autoFocus
                  value={categoryModal.value}
                  onChange={(e) =>
                    setCategoryModal({ ...categoryModal, value: e.target.value })
                  }
                  placeholder="Ej: Empanadas Especiales"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E4F]/20 focus:border-[#1F4E4F]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveCategoryModal();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCategoryModal(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategoryModal}
                  disabled={!categoryModal.value.trim()}
                  className="px-4 py-2 rounded-xl bg-[#1F4E4F] hover:bg-[#163839] disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* MODAL DE COTIZACIÓN Y FLUJO COMPLETO DE CONFIRMACIÓN (Z-80 OVERLAY) */}
    {quotingOrder && (
      <div className="fixed inset-0 z-80 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Header */}
          <div className="bg-[#1F4E4F] text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center font-bold shadow-xs shrink-0">
                <MessageCircle className="w-5 h-5 text-[#1F4E4F]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                    Flujo de Cotización & Confirmación
                  </h3>
                  <span className="font-mono text-xs bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded-md font-bold">
                    #{quotingOrder.serialNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-teal-100 flex-wrap">
                  <span>Cliente: <strong className="text-white">{quotingOrder.customerName}</strong></span>
                  <span>•</span>
                  <span>📱 {quotingOrder.customerPhone || 'Sin teléfono'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuotingOrder(null);
                setQuotePrices({});
              }}
              className="p-1.5 hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* STEPPER / TIMELINE VISUAL DE 4 ETAPAS */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-stone-500">
                  Etapa Actual del Pedido
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                  quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : quotingOrder.orderStatus === 'aprobada_cliente'
                    ? 'bg-purple-100 text-purple-800 border-purple-300'
                    : quotingOrder.orderStatus === 'cotizada'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                    ? '🟢 Confirmada en Cocina'
                    : quotingOrder.orderStatus === 'aprobada_cliente'
                    ? '🟣 Aprobada por Cliente'
                    : quotingOrder.orderStatus === 'cotizada'
                    ? '🔵 Cotización Enviada'
                    : '🟡 Pendiente de Cotizar'}
                </span>
              </div>

              {/* Grid 4 Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {/* Step 1: Solicitud Recibida */}
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <span className="font-bold text-[11px] block text-stone-800 leading-tight">
                    1. Solicitado
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Recibido
                  </span>
                </div>

                {/* Step 2: Cotización Nill Food */}
                {(() => {
                  const isDone = quotingOrder.orderStatus === 'cotizada' || quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada';
                  return (
                    <div className={`p-2.5 rounded-xl border shadow-2xs space-y-1 ${
                      isDone ? 'bg-white border-blue-300' : 'bg-amber-50/70 border-amber-300 animate-pulse'
                    }`}>
                      <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                        isDone ? 'bg-blue-100 text-blue-700' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {isDone ? '✓' : '2'}
                      </div>
                      <span className="font-bold text-[11px] block text-stone-800 leading-tight">
                        2. Cotizado
                      </span>
                      <span className={`text-[10px] block font-semibold ${isDone ? 'text-blue-700' : 'text-amber-800'}`}>
                        {isDone ? 'Precios Fijados' : 'Por Cotizar'}
                      </span>
                    </div>
                  );
                })()}

                {/* Step 3: Confirmación Cliente */}
                {(() => {
                  const isDone = quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada';
                  const isWaiting = quotingOrder.orderStatus === 'cotizada';
                  return (
                    <div className={`p-2.5 rounded-xl border shadow-2xs space-y-1 ${
                      isDone
                        ? 'bg-white border-purple-300'
                        : isWaiting
                        ? 'bg-purple-50/70 border-purple-300 animate-pulse'
                        : 'bg-stone-100/70 border-stone-200 opacity-60'
                    }`}>
                      <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                        isDone
                          ? 'bg-purple-100 text-purple-700'
                          : isWaiting
                          ? 'bg-purple-200 text-purple-800'
                          : 'bg-stone-200 text-stone-500'
                      }`}>
                        {isDone ? '✓' : '3'}
                      </div>
                      <span className="font-bold text-[11px] block text-stone-800 leading-tight">
                        3. Conf. Cliente
                      </span>
                      <span className={`text-[10px] block font-semibold ${
                        isDone ? 'text-purple-700' : isWaiting ? 'text-purple-700 font-bold' : 'text-stone-400'
                      }`}>
                        {isDone ? 'Aprobado' : isWaiting ? 'Esperando Resp.' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })()}

                {/* Step 4: Confirmado en Cocina (Admin) */}
                {(() => {
                  const isDone = quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin';
                  const isReadyToConfirm = quotingOrder.orderStatus === 'aprobada_cliente';
                  return (
                    <div className={`p-2.5 rounded-xl border shadow-2xs space-y-1 ${
                      isDone
                        ? 'bg-white border-emerald-400'
                        : isReadyToConfirm
                        ? 'bg-emerald-50 border-emerald-300 animate-pulse'
                        : 'bg-stone-100/70 border-stone-200 opacity-60'
                    }`}>
                      <div className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isReadyToConfirm
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-stone-200 text-stone-500'
                      }`}>
                        {isDone ? '✓' : '4'}
                      </div>
                      <span className="font-bold text-[11px] block text-stone-800 leading-tight">
                        4. Cocina Admin
                      </span>
                      <span className={`text-[10px] block font-semibold ${
                        isDone ? 'text-emerald-700 font-black' : isReadyToConfirm ? 'text-emerald-700 font-bold' : 'text-stone-400'
                      }`}>
                        {isDone ? 'En Cocina' : isReadyToConfirm ? 'Listo Confirmar' : 'Pendiente'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SECCIÓN 1: FIJACIÓN DE PRECIOS PARA PICADERAS (ETAPA 2) */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Precios de Picaderas Personalizadas ({quotingOrder.customPicaderas?.length || 0})
                  </h4>
                </div>
                {quotingOrder.quoteSentAt && (
                  <span className="text-[10px] text-stone-400 font-medium">
                    Cotización enviada: {new Date(quotingOrder.quoteSentAt).toLocaleDateString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {quotingOrder.customPicaderas && quotingOrder.customPicaderas.length > 0 ? (
                <div className="space-y-2.5">
                  {quotingOrder.customPicaderas.map((cp, idx) => {
                    const itemKey = cp.id || cp.name || `custom-${idx}`;
                    const currentPrice = quotePrices[itemKey] ?? (quotingOrder.quotePrices ? quotingOrder.quotePrices[itemKey] ?? '' : '');

                    return (
                      <div
                        key={itemKey}
                        className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-xs">
                              {cp.name}
                            </span>
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {cp.units} unidades
                            </span>
                          </div>
                          {cp.notes && (
                            <p className="text-[11px] text-stone-500 mt-0.5 italic">
                              Nota: "{cp.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[11px] font-bold text-stone-600">
                            Precio RD$:
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={currentPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setQuotePrices((prev) => ({
                                ...prev,
                                [itemKey]: val,
                              }));
                            }}
                            className="w-28 px-3 py-1.5 rounded-xl border border-stone-300 font-bold text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#1F4E4F]/30 focus:border-[#1F4E4F] bg-white text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-stone-500 italic p-3 text-center bg-stone-50 rounded-xl border border-stone-200">
                  No se registraron picaderas personalizadas en este pedido.
                </div>
              )}

              {/* Subtotal & Totals Box */}
              {(() => {
                const additionalSum = Object.values(quotePrices).reduce((a, b) => a + b, 0);
                const newGrandTotal = quotingOrder.grandTotal + additionalSum;

                return (
                  <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span>Subtotal productos base:</span>
                      <span className="font-semibold text-stone-800">{formatRD(quotingOrder.grandTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span>Suma de picaderas cotizadas:</span>
                      <span className="font-bold text-[#1F4E4F]">+ {formatRD(additionalSum)}</span>
                    </div>
                    <div className="pt-2 border-t border-teal-200 flex items-center justify-between text-sm">
                      <span className="font-bold text-stone-900">Total Definitivo del Pedido:</span>
                      <span className="font-black text-base text-[#A61B1B]">{formatRD(newGrandTotal)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Action: Send Quote via WhatsApp */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const additionalSum = Object.values(quotePrices).reduce((a, b) => a + b, 0);
                    const newGrandTotal = quotingOrder.grandTotal + additionalSum;

                    let cleanPhone = (quotingOrder.customerPhone || '').replace(/\D/g, '');
                    if (cleanPhone.length === 10 && (cleanPhone.startsWith('809') || cleanPhone.startsWith('829') || cleanPhone.startsWith('849'))) {
                      cleanPhone = `1${cleanPhone}`;
                    }
                    if (!cleanPhone) {
                      cleanPhone = settings.whatsapp_number.replace(/\D/g, '');
                    }

                    const lines: string[] = [];
                    lines.push(`Hola *${quotingOrder.customerName}*! 👋`);
                    lines.push('Te saludamos cordialmente de *Nill Food · Comida Criolla* 🥘');
                    lines.push(`Hemos evaluado con nuestro equipo tu pedido con *No. de Serie:* \`${quotingOrder.serialNumber}\` y te compartimos la cotización formal de tus picaderas solicitadas:`);
                    lines.push('');
                    lines.push('📋 *Picaderas Personalizadas Cotizadas:*');

                    quotingOrder.customPicaderas?.forEach((cp, idx) => {
                      const itemKey = cp.id || cp.name || `custom-${idx}`;
                      const price = quotePrices[itemKey] || 0;
                      lines.push(`• *${cp.name}* (${cp.units} unidades): RD$ ${price.toLocaleString('es-DO', { minimumFractionDigits: 2 })}${cp.notes ? ` _(Detalle: ${cp.notes})_` : ''}`);
                    });

                    lines.push('');
                    lines.push(`💵 *Subtotal productos estándar:* RD$ ${quotingOrder.grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`);
                    lines.push(`➕ *Monto picaderas cotizadas:* RD$ ${additionalSum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`);
                    lines.push(`💰 *TOTAL DEFINITIVO DEL PEDIDO:* RD$ ${newGrandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`);
                    lines.push('');
                    lines.push(`🍱 *Presentación de Empaque:* ${quotingOrder.packagingType === 'bandeja' ? 'Bandeja de Exhibición' : quotingOrder.packagingType === 'caja' ? 'Caja Kraft' : 'Individual'}`);
                    lines.push(`🚚 *Entrega:* ${quotingOrder.deliveryMethod === 'delivery' ? `A Domicilio (${quotingOrder.deliveryAddress || ''})` : 'Retiro en Tienda'} para el ${quotingOrder.deliveryDateTime}`);
                    lines.push('');
                    lines.push('📌 _Para reservar tu fecha en el calendario y comenzar la preparación, por favor responde a este mensaje confirmando tu aprobación de la cotización._ ¡Muchas gracias!');

                    const messageText = lines.join('\n');
                    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

                    const updatedOrder: OrderHistoryItem = {
                      ...quotingOrder,
                      orderStatus: 'cotizada',
                      grandTotal: newGrandTotal,
                      quotePrices: { ...quotePrices },
                      quoteSentAt: new Date().toISOString(),
                    };
                    const updatedHistory = updateOrderInHistory(updatedOrder);
                    setAdminOrderHistory(updatedHistory);
                    setQuotingOrder(updatedOrder);

                    try {
                      const link = document.createElement('a');
                      link.href = waUrl;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch {
                      window.open(waUrl, '_blank');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>
                    {quotingOrder.orderStatus === 'pendiente'
                      ? 'Enviar Cotización por WhatsApp'
                      : 'Reenviar / Actualizar Cotización por WhatsApp'}
                  </span>
                </button>
              </div>
            </div>

            {/* SECCIÓN 2: ESTADO DE CONFIRMACIÓN DEL CLIENTE (ETAPA 3) */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
              quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                ? 'bg-purple-50/60 border-purple-200'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    3
                  </div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Confirmación del Cliente (Aprobación del Presupuesto)
                  </h4>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                  quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada'
                    ? '✓ Confirmado por Cliente'
                    : '⏳ Esperando Aprobación'}
                </span>
              </div>

              {quotingOrder.orderStatus === 'aprobada_cliente' || quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin' ? (
                <div className="p-3 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed flex-1">
                    <span className="font-bold block">
                      ¡Aprobación del cliente confirmada!
                    </span>
                    El cliente {quotingOrder.customerName} aprobó la cotización y confirmó su pedido.
                    {quotingOrder.clientConfirmedAt && (
                      <span className="block text-[11px] text-purple-700 mt-0.5">
                        Registrado el: {new Date(quotingOrder.clientConfirmedAt).toLocaleString('es-DO')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedOrder: OrderHistoryItem = {
                        ...quotingOrder,
                        orderStatus: 'cotizada',
                        clientConfirmedAt: undefined,
                      };
                      const updatedHistory = updateOrderInHistory(updatedOrder);
                      setAdminOrderHistory(updatedHistory);
                      setQuotingOrder(updatedOrder);
                    }}
                    className="text-[10px] text-purple-700 hover:text-purple-900 underline font-semibold cursor-pointer shrink-0"
                  >
                    Revertir a cotizada
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Una vez que el cliente responda al WhatsApp aceptando los precios cotizados, haz clic en el botón de abajo para registrar formalmente su aprobación y dar paso a la preparación.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const updatedOrder: OrderHistoryItem = {
                          ...quotingOrder,
                          orderStatus: 'aprobada_cliente',
                          clientConfirmedAt: new Date().toISOString(),
                        };
                        const updatedHistory = updateOrderInHistory(updatedOrder);
                        setAdminOrderHistory(updatedHistory);
                        setQuotingOrder(updatedOrder);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Registrar Confirmación del Cliente</span>
                    </button>

                    {quotingOrder.orderStatus === 'cotizada' && (
                      <a
                        href={`https://wa.me/${(quotingOrder.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${quotingOrder.customerName}! 👋 Te saludamos de Nill Food. Quisiéramos saber si pudiste revisar la cotización de tu pedido #${quotingOrder.serialNumber}. ¡Estamos atentos para reservar tu fecha!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enviar Recordatorio WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 3: RECIBIDA LA CONFIRMACIÓN POR EL ADMINISTRADOR (ETAPA 4 - COCINA) */}
            <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
              quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    4
                  </div>
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    Confirmación Recibida por Administrador (Pase a Cocina)
                  </h4>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                  quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin'
                    ? '🟢 Confirmado en Cocina'
                    : 'Pendiente de Validación'}
                </span>
              </div>

              {quotingOrder.orderStatus === 'confirmada' || quotingOrder.orderStatus === 'recibida_admin' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed flex-1">
                      <span className="font-bold block text-emerald-900">
                        🎉 ¡Pedido 100% Confirmado y Programado para Cocina!
                      </span>
                      El equipo de cocina de Nill Food tiene agendada esta orden para el día{' '}
                      <strong>{quotingOrder.deliveryDateTime}</strong> ({quotingOrder.deliveryMethod === 'delivery' ? 'Domicilio' : 'Retiro en Tienda'}).
                      {quotingOrder.adminConfirmedAt && (
                        <span className="block text-[11px] text-emerald-800 mt-0.5">
                          Confirmado por administración el: {new Date(quotingOrder.adminConfirmedAt).toLocaleString('es-DO')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Send final confirmation receipt */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${(quotingOrder.customerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola *${quotingOrder.customerName}*! 🎉 Confirmamos que hemos recibido formalmente tu aprobación del pedido *#${quotingOrder.serialNumber}*. Tu orden con total de RD$ ${quotingOrder.grandTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })} ya está agendada en cocina para entrega el ${quotingOrder.deliveryDateTime}. ¡Gracias por confiar en Nill Food! 🥘`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Enviar Comprobante Final por WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Al recibir el pago o confirmación definitiva del cliente, pulsa este botón para cerrar el ciclo, pasar el pedido formalmente a cocina y asegurar la fecha en el calendario.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedOrder: OrderHistoryItem = {
                        ...quotingOrder,
                        orderStatus: 'confirmada',
                        adminConfirmedAt: new Date().toISOString(),
                      };
                      const updatedHistory = updateOrderInHistory(updatedOrder);
                      setAdminOrderHistory(updatedHistory);
                      setQuotingOrder(updatedOrder);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-800/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirmar Recepción y Pasar a Cocina</span>
                  </button>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: SELECTOR MANUAL RÁPIDO DE ESTADO (FLEXIBILIDAD DEL ADMIN) */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-[11px] font-bold text-stone-600">
                Cambio manual directo de estado:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {(['pendiente', 'cotizada', 'aprobada_cliente', 'confirmada'] as const).map((st) => {
                  const isCurrent = quotingOrder.orderStatus === st;
                  const labels = {
                    pendiente: '1. Pendiente',
                    cotizada: '2. Cotizada',
                    aprobada_cliente: '3. Aprobada Cliente',
                    confirmada: '4. En Cocina',
                  };
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        const updatedOrder: OrderHistoryItem = {
                          ...quotingOrder,
                          orderStatus: st,
                          clientConfirmedAt: st === 'aprobada_cliente' ? new Date().toISOString() : quotingOrder.clientConfirmedAt,
                          adminConfirmedAt: st === 'confirmada' ? new Date().toISOString() : quotingOrder.adminConfirmedAt,
                        };
                        const updatedHistory = updateOrderInHistory(updatedOrder);
                        setAdminOrderHistory(updatedHistory);
                        setQuotingOrder(updatedOrder);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#1F4E4F] text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {labels[st]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setQuotingOrder(null);
                setQuotePrices({});
              }}
              className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
            >
              Listo / Cerrar
            </button>

            <span className="text-[11px] text-stone-500 font-medium">
              Los cambios se guardan automáticamente en el historial.
            </span>
          </div>
        </div>
      </div>
    )}
  </>
);
};
