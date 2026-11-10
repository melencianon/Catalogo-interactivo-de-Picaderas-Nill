import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, AppSettings, ComboSize } from '../types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_CATEGORIES, INITIAL_COMBO_SIZES } from '../data/initialData';

// Local storage keys for fallback cache (v3 with brochure assets)
const STORAGE_KEY_PRODUCTS = 'nill_food_products_cache_v3';
const STORAGE_KEY_SETTINGS = 'nill_food_settings_cache_v3';
const STORAGE_KEY_CATEGORIES = 'nill_food_categories_cache_v3';
const STORAGE_KEY_SIZES = 'nill_food_combo_sizes_cache_v3';
const STORAGE_KEY_SUPABASE_CONFIG = 'nill_food_supabase_config';
const STORAGE_KEY_DELETED_PRODUCTS = 'nill_food_deleted_products_cache_v3';

export function getDeletedProductIds(): string[] {
  return getLocalCache<string[]>(STORAGE_KEY_DELETED_PRODUCTS, []);
}

export function markProductAsDeleted(id: string) {
  const current = getDeletedProductIds();
  if (!current.includes(id)) {
    setLocalCache(STORAGE_KEY_DELETED_PRODUCTS, [...current, id]);
  }
}

export function clearDeletedProductsRecord() {
  localStorage.removeItem(STORAGE_KEY_DELETED_PRODUCTS);
}

export function unmarkProductAsDeleted(id: string) {
  const current = getDeletedProductIds();
  const next = current.filter((item) => item !== id);
  setLocalCache(STORAGE_KEY_DELETED_PRODUCTS, next);
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch (e) {
    console.error('Error reading supabase config from storage', e);
  }

  // Fallback to Vite env variables if present
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(config));
  // Invalidate cached client
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith('https://')) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return cachedClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return null;
}

/**
 * Image compressor using HTML5 canvas.
 * Reduces raw mobile photos (often 5MB+) to an optimized ~100KB-180KB image before upload.
 */
export async function compressImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Draw with white background for transparency safety
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              reject(new Error('Canvas blob generation failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to Supabase Storage bucket 'picaderas_images',
 * or return compressed base64 DataURL if storage is not connected.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const { blob, dataUrl } = await compressImage(file);
  const client = getSupabaseClient();

  if (client) {
    try {
      const fileExt = 'jpg';
      const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `catalog/${fileName}`;

      const { error: uploadError } = await client.storage
        .from('picaderas_images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error, falling back to local compressed:', uploadError);
        return dataUrl;
      }

      const { data: publicUrlData } = client.storage
        .from('picaderas_images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Error during image upload, using local compressed data:', e);
    }
  }

  // Graceful fallback to compressed Data URL
  return dataUrl;
}

/**
 * Load Catalog from Supabase, or fallback to LocalStorage/Default
 */
export async function loadCatalogFromCloud(): Promise<{
  products: Product[];
  settings: AppSettings;
  categories: string[];
  comboSizes: ComboSize[];
  isOnline: boolean;
  statusMessage?: string;
}> {
  const client = getSupabaseClient();

  const deletedIds = getDeletedProductIds();
  // Load local cache first as immediate baseline
  const rawLocalProducts = getLocalCache<Product[]>(STORAGE_KEY_PRODUCTS, INITIAL_PRODUCTS);
  const localSettings = getLocalCache<AppSettings>(STORAGE_KEY_SETTINGS, INITIAL_SETTINGS);
  const rawLocalCategories = getLocalCache<string[]>(STORAGE_KEY_CATEGORIES, INITIAL_CATEGORIES);
  const localSizes = getLocalCache<ComboSize[]>(STORAGE_KEY_SIZES, INITIAL_COMBO_SIZES);

  // Filter out any explicitly deleted products
  const localProducts = [...rawLocalProducts].filter((p) => !deletedIds.includes(p.id));
  INITIAL_PRODUCTS.forEach((initProd) => {
    if (deletedIds.includes(initProd.id)) return; // DO NOT revive deleted products
    const existingIdx = localProducts.findIndex((p) => p.id === initProd.id);
    if (existingIdx === -1) {
      localProducts.push(initProd);
    } else if (!localProducts[existingIdx].image_url && initProd.image_url) {
      localProducts[existingIdx] = {
        ...localProducts[existingIdx],
        image_url: initProd.image_url,
        description: localProducts[existingIdx].description || initProd.description,
      };
    }
  });

  const localCategories = Array.from(new Set([...INITIAL_CATEGORIES, ...rawLocalCategories]));

  if (!client) {
    return {
      products: localProducts,
      settings: localSettings,
      categories: localCategories,
      comboSizes: localSizes,
      isOnline: false,
      statusMessage: 'Modo local activo (los cambios se guardan en este dispositivo). Conecta Supabase en el panel para sincronizar en la nube.',
    };
  }

  try {
    // 1. Fetch products from Supabase
    const { data: dbProducts, error: prodErr } = await client
      .from('picaderas_catalog')
      .select('*')
      .order('name');

    if (prodErr) {
      console.warn('Supabase catalog error:', prodErr);
      throw prodErr;
    }

    let finalProducts = localProducts;
    if (dbProducts && dbProducts.length > 0) {
      finalProducts = dbProducts.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        category: row.category || 'Picaderas fritas',
        emoji: row.emoji || '🥟',
        image_url: row.image_url || null,
        price_dozen: row.price_dozen ?? null,
        price_half: row.price_half ?? null,
        price_unit: row.price_unit ?? null,
        price_mode: row.price_mode || 'auto',
        sales_modality: row.sales_modality || 'todas',
        available: row.available ?? true,
        fillings: Array.isArray(row.fillings) ? row.fillings : (row.fillings ? JSON.parse(row.fillings) : []),
        wholesale_unit_price: row.wholesale_unit_price ?? null,
        wholesale_batch_price: row.wholesale_batch_price ?? null,
      }));
      // Update local cache
      setLocalCache(STORAGE_KEY_PRODUCTS, finalProducts);
    } else {
      // Database exists but is empty -> Seed initial catalog!
      await seedSupabaseInitialData(client, INITIAL_PRODUCTS);
      finalProducts = INITIAL_PRODUCTS;
    }

    // 2. Fetch settings from Supabase
    const { data: dbSettings } = await client
      .from('nill_food_settings')
      .select('*')
      .eq('id', 'default_settings')
      .maybeSingle();

    let finalSettings = localSettings;
    if (dbSettings) {
      finalSettings = {
        ...localSettings,
        brand_name: dbSettings.brand_name || localSettings.brand_name,
        brand_slogan: dbSettings.brand_slogan || localSettings.brand_slogan,
        whatsapp_number: dbSettings.whatsapp_number || localSettings.whatsapp_number,
        whatsapp_welcome: dbSettings.whatsapp_welcome || localSettings.whatsapp_welcome,
        address: dbSettings.address || localSettings.address,
        email: dbSettings.email || localSettings.email,
        logo_url: dbSettings.logo_url || localSettings.logo_url,
        special_combo_price: dbSettings.special_combo_price ?? localSettings.special_combo_price,
        wholesale_min_units: dbSettings.wholesale_min_units ?? localSettings.wholesale_min_units,
      };
      setLocalCache(STORAGE_KEY_SETTINGS, finalSettings);
    }

    return {
      products: finalProducts,
      settings: finalSettings,
      categories: localCategories,
      comboSizes: localSizes,
      isOnline: true,
      statusMessage: 'Conectado en tiempo real con Supabase.',
    };
  } catch (err: any) {
    console.warn('Fallback to local cache due to Supabase error:', err);
    return {
      products: localProducts,
      settings: localSettings,
      categories: localCategories,
      comboSizes: localSizes,
      isOnline: false,
      statusMessage: 'Trabajando con copia local en caché. Los datos se sincronizarán al restablecer conexión con Supabase.',
    };
  }
}

/**
 * Save products & settings changes to Cloud / Cache
 */
export async function syncCatalogToCloud(
  products: Product[],
  settings: AppSettings,
  categories: string[],
  comboSizes: ComboSize[]
): Promise<{ success: boolean; error?: string }> {
  // Always update local cache first
  setLocalCache(STORAGE_KEY_PRODUCTS, products);
  setLocalCache(STORAGE_KEY_SETTINGS, settings);
  setLocalCache(STORAGE_KEY_CATEGORIES, categories);
  setLocalCache(STORAGE_KEY_SIZES, comboSizes);

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  try {
    // Upsert products
    const dbPayload = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      emoji: p.emoji,
      image_url: p.image_url,
      price_dozen: p.price_dozen,
      price_half: p.price_half,
      price_unit: p.price_unit,
      price_mode: p.price_mode,
      sales_modality: p.sales_modality,
      available: p.available,
      fillings: p.fillings,
      wholesale_unit_price: p.wholesale_unit_price,
      wholesale_batch_price: p.wholesale_batch_price,
      updated_at: new Date().toISOString(),
    }));

    const { error: prodErr } = await client
      .from('picaderas_catalog')
      .upsert(dbPayload, { onConflict: 'id' });

    if (prodErr) throw prodErr;

    // Purge any deleted products from Supabase database table
    const currentIds = products.map((p) => p.id);
    const { data: dbRows } = await client.from('picaderas_catalog').select('id');
    if (dbRows && dbRows.length > 0) {
      const idsToDelete = dbRows
        .map((r: any) => r.id)
        .filter((id: string) => !currentIds.includes(id));
      if (idsToDelete.length > 0) {
        await client.from('picaderas_catalog').delete().in('id', idsToDelete);
      }
    }

    // Upsert settings
    const { error: setErr } = await client
      .from('nill_food_settings')
      .upsert({
        id: 'default_settings',
        brand_name: settings.brand_name,
        brand_slogan: settings.brand_slogan,
        whatsapp_number: settings.whatsapp_number,
        whatsapp_welcome: settings.whatsapp_welcome,
        address: settings.address,
        email: settings.email,
        logo_url: settings.logo_url,
        special_combo_price: settings.special_combo_price,
        wholesale_min_units: settings.wholesale_min_units,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (setErr) throw setErr;

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return { success: false, error: err.message || 'Error al sincronizar con Supabase' };
  }
}

/**
 * Delete a product from Supabase table and local cache
 */
export async function deleteProductFromCloud(productId: string) {
  markProductAsDeleted(productId);
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('picaderas_catalog').delete().eq('id', productId);
    } catch (e) {
      console.warn('Error deleting product from Supabase:', e);
    }
  }
}

/**
 * Seed initial catalog to empty Supabase database
 */
async function seedSupabaseInitialData(client: SupabaseClient, products: Product[]) {
  try {
    const payload = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      emoji: p.emoji,
      image_url: p.image_url,
      price_dozen: p.price_dozen,
      price_half: p.price_half,
      price_unit: p.price_unit,
      price_mode: p.price_mode,
      sales_modality: p.sales_modality,
      available: p.available,
      fillings: p.fillings,
      wholesale_unit_price: p.wholesale_unit_price,
      wholesale_batch_price: p.wholesale_batch_price,
    }));
    await client.from('picaderas_catalog').insert(payload);
  } catch (e) {
    console.warn('Error seeding initial data to Supabase:', e);
  }
}

// Local Storage helpers
function getLocalCache<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage write failed:', e);
  }
}

/**
 * Ready-to-run SQL schema script for Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- 1. Tabla de Catálogo de Picaderas
create table if not exists public.picaderas_catalog (
  id text primary key,
  name text not null,
  description text,
  category text not null default 'Picaderas fritas',
  emoji text default '🥟',
  image_url text,
  price_dozen numeric,
  price_half numeric,
  price_unit numeric,
  price_mode text default 'auto',
  sales_modality text default 'todas',
  available boolean default true,
  fillings jsonb default '[]'::jsonb,
  wholesale_unit_price numeric,
  wholesale_batch_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabla de Ajustes de Nill Food
create table if not exists public.nill_food_settings (
  id text primary key default 'default_settings',
  brand_name text default 'NILL FOOD',
  brand_slogan text default 'Comida Criolla',
  whatsapp_number text default '18098733960',
  whatsapp_welcome text,
  address text,
  email text,
  logo_url text,
  special_combo_price numeric default 750,
  wholesale_min_units numeric default 50,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Activar Seguridad a Nivel de Fila (RLS)
alter table public.picaderas_catalog enable row level security;
alter table public.nill_food_settings enable row level security;

-- 4. Políticas de Seguridad:
-- Permitir lectura pública (los clientes de Instagram siempre ven el catálogo más reciente)
create policy "Lectura pública de picaderas"
  on public.picaderas_catalog for select
  using (true);

create policy "Lectura pública de ajustes"
  on public.nill_food_settings for select
  using (true);

-- Permitir inserción, actualización y borrado al Administrador autenticado (o anon con API Key configurada)
create policy "Modificación de picaderas para administradores"
  on public.picaderas_catalog for all
  using (true)
  with check (true);

create policy "Modificación de ajustes para administradores"
  on public.nill_food_settings for all
  using (true)
  with check (true);

-- 5. Crear el Bucket de Storage para Imágenes (si no existe)
-- Ve a Supabase Dashboard -> Storage -> Crear bucket: 'picaderas_images' y marcarlo como 'Public bucket'.
`;
