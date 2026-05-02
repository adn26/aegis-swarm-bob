import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Initialize Supabase client
 */
let supabaseClient = null;

export const initSupabase = () => {
  try {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase URL and Service Role Key are required');
    }

    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    logger.info('Supabase client initialized successfully');
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    throw error;
  }
};

/**
 * Get Supabase client instance
 */
export const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = initSupabase();
  }
  return supabaseClient;
};

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audits')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    logger.info('Supabase connection test successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection test failed:', error);
    throw error;
  }
};

/**
 * Close database connection (cleanup)
 */
export const closeDatabase = () => {
  try {
    // Supabase client doesn't require explicit closing
    // but we can clean up the reference
    if (supabaseClient) {
      logger.info('Cleaning up Supabase client');
      supabaseClient = null;
    }
  } catch (error) {
    logger.error('Error during database cleanup:', error);
  }
};

export default { initSupabase, getSupabase, testConnection, closeDatabase };

// Made with Bob
