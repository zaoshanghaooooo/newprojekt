import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['canvas', 'jsdom'],
    esmExternals: true
  },
  staticPageGenerationTimeout: 120,
  webpack: (config, { isServer }) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    
    // Pfadalias-Konfiguration
    config.resolve.alias = {
      ...config.resolve?.alias,
      '@': path.resolve(__dirname, 'src'),
      'src': path.resolve(__dirname, 'src')
    };
    
    // Ensure Terser compression is enabled (default behavior)
    config.optimization = {
      ...config.optimization,
      minimize: true // Or remove this line entirely if default is desired and no other optimization keys are spread
    };

    // 处理TypeORM的警告
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false
      };
    }
    
    return config;
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    FEIEYUN_URL: process.env.FEIEYUN_URL || 'http://api.de.feieyun.com/Api/Open/',
    FEIEYUN_USER: process.env.FEIEYUN_USER || '',
    FEIEYUN_UKEY: process.env.FEIEYUN_UKEY || '',
    FEIEYUN_SN: process.env.FEIEYUN_SN || '',
    SECRET_KEY: process.env.SECRET_KEY,
    API_PREFIX: process.env.API_PREFIX || '/api'
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig; 