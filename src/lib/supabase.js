/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for the Analytics Form feature.
 * Used for storing form configurations and user responses.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmxejudcbaclbpmuygef.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteGVqdWRjYmFjbGJwbXV5Z2VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTg4NzYsImV4cCI6MjA3OTY3NDg3Nn0.UrvijD9BdCU9BWBTSiJsD-sUbTWmsf0Qt0uPkWCP76g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
