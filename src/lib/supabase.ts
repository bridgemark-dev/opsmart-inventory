import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { CONFIG } from '../../config.js';

export const supabase = createClient<Database>(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON
);
