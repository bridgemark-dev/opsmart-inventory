/* ============================================================
   CONFIG — Client configuration
   One file to change per deployment. Never commit real keys.
   ============================================================ */
export const CONFIG = {
  // Supabase credentials — set via environment variables (Netlify / Vite)
  SUPABASE_URL:  import.meta.env?.VITE_SUPABASE_URL  ?? '',
  SUPABASE_ANON: import.meta.env?.VITE_SUPABASE_ANON ?? '',

  // Client branding
  CLIENT_NAME:   "Pandora's Box",
  PRODUCT_NAME:  'OpSmart Inventory',
  COMPANY_NAME:  'Bridgemark Digital',

  // Business links (shown in sidebar footer)
  LINKS: {
    google:   'https://business.google.com',
    facebook: 'https://www.facebook.com',
    website:  'https://www.bridgemarkdigital.com',
  },

  // App version
  VERSION: '1.0.0',
};
