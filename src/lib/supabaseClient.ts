import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
  try {
    if (key === 'VITE_SUPABASE_URL') return import.meta.env.VITE_SUPABASE_URL || '';
    if (key === 'VITE_SUPABASE_ANON_KEY') return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  } catch {}
  return '';
};

const supabaseUrl = (getEnvVar('VITE_SUPABASE_URL')).trim();
const supabaseAnonKey = (getEnvVar('VITE_SUPABASE_ANON_KEY')).trim();

export const isSupabaseConfigured = 
  supabaseUrl.length > 0 && 
  supabaseAnonKey.length > 0 && 
  supabaseUrl.startsWith('https://');

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase connection details are missing or incomplete. Please check your environment variables.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null as any;

/**
 * Returns a permanent public storage URL for files stored in Supabase Storage.
 * Strips temporary tokens, converts signed endpoints to public endpoints, and ensures URLs never expire.
 */
export function getPermanentStorageUrl(pathOrUrl: string, bucket = 'eye-bucket'): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Base64 data URLs are inherently permanent and self-contained
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    // 1. If input is already an HTTP/HTTPS URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // If it points to Supabase Storage, convert signed path to public path and clean query params
      if (trimmed.includes('/storage/v1/object/')) {
        let cleanUrl = trimmed.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');

        try {
          const urlObj = new URL(cleanUrl);
          const tempParams = [
            'token',
            'expires',
            'expiry',
            'X-Amz-Algorithm',
            'X-Amz-Credential',
            'X-Amz-Date',
            'X-Amz-Expires',
            'X-Amz-SignedHeaders',
            'X-Amz-Signature',
            'X-Amz-Security-Token',
            't'
          ];
          tempParams.forEach(param => urlObj.searchParams.delete(param));
          
          return urlObj.origin + urlObj.pathname + (urlObj.searchParams.toString() ? `?${urlObj.searchParams.toString()}` : '');
        } catch {
          return cleanUrl;
        }
      }
      return trimmed;
    }

    // 2. Process relative paths or custom schemes like supabase://storage/bucket/path
    let storagePath = trimmed;
    if (storagePath.startsWith(`supabase://storage/${bucket}/`)) {
      storagePath = storagePath.replace(`supabase://storage/${bucket}/`, '');
    } else if (storagePath.startsWith('supabase://storage/')) {
      const parts = storagePath.replace('supabase://storage/', '').split('/');
      parts.shift(); // remove bucket name
      storagePath = parts.join('/');
    }

    // Clean leading slashes
    storagePath = storagePath.replace(/^\/+/, '');

    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      if (data?.publicUrl) {
        return data.publicUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
      }
    }

    const baseUrl = supabaseUrl ? supabaseUrl.replace(/\/+$/, '') : '';
    return `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
  } catch (err) {
    console.error('Error resolving permanent storage URL:', err);
    return trimmed;
  }
}

