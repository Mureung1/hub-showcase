import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A Supabase project URL is public configuration. Preserve the existing
  // server-style SUPABASE_URL name while making it available to browser code.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
  },
};

export default nextConfig;
