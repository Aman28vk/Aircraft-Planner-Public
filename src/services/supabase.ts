import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Public CV / Portfolio Demonstration Mode
 * Supabase client is disconnected to protect your production Supabase database
 * and keep the website 100% interactive using browser local storage.
 */

export const isSupabaseConfigured = (): boolean => {
  return false;
};

export const getSupabaseUrl = (): string => {
  return '';
};

export const getSupabaseAnonKey = (): string => {
  return '';
};

export const getSupabaseClient = (): SupabaseClient | null => {
  return null;
};

export const setSupabaseCredentials = (_url: string, _anonKey: string): SupabaseClient | null => {
  return null;
};

export const resetSupabaseClient = (): void => {};

export const supabase: SupabaseClient | null = null;
