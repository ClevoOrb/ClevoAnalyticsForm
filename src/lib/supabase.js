/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for the Analytics Form feature.
 * Used for storing form configurations and user responses.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
