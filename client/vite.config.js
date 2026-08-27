import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

// Fixes 404s when refreshing on /admin/* in dev mode
const adminFallbackPlugin = () => ({
  name: 'admin-fallback',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // If request is for /admin/something, and doesn't have a file extension
      if (req.url.startsWith('/admin') && !req.url.match(/\.[a-zA-Z0-9]+$/)) {
        req.url = '/admin/index.html';
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/admin') && !req.url.match(/\.[a-zA-Z0-9]+$/)) {
        req.url = '/admin/index.html';
      }
      next();
    });
  }
});

// VitePWA injects its manifest into all HTML files. We have two PWAs, so they conflict.
// This plugin cleans up the wrong manifest from the wrong HTML file.
const fixManifestConflictPlugin = () => ({
  name: 'fix-manifest-conflict',
  enforce: 'post',
  transformIndexHtml(html, ctx) {
    if (ctx.path && ctx.path.includes('admin')) {
      // Admin page: remove the customer manifest link if VitePWA injected it
      return html.replace(/<link rel="manifest" href="\/manifest\.json"[^>]*>/g, '');
    } else {
      // Customer page: remove the admin manifest link if VitePWA injected it
      return html.replace(/<link rel="manifest" href="\/admin-manifest\.json"[^>]*>/g, '');
    }
  }
});

export default defineConfig({
  plugins: [
    adminFallbackPlugin(),
    fixManifestConflictPlugin(),
    react(), 
    tailwindcss(),
    VitePWA({
      id: 'customer',
      manifestFilename: 'manifest.json',
      swDest: 'sw.js',
      scope: '/',
      injectRegister: null,
      manifest: {
        name: 'VALTA Cafe',
        short_name: 'VALTA',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#f59e0b',
        background_color: '#ffffff',
        icons: [
          { src: '/customer-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/customer-icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectManifest: {
        rollupFormat: 'iife',
        globPatterns: ['**/*.{js,css,html,svg}']
      }
    }),
    VitePWA({
      id: 'admin',
      manifestFilename: 'admin-manifest.json',
      swDest: 'admin-sw.js',
      scope: '/admin/',
      injectRegister: null,
      manifest: {
        name: 'VALTA Cafe Admin',
        short_name: 'VALTA Admin',
        start_url: '/admin/',
        scope: '/admin/',
        display: 'standalone',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        icons: [
          { src: '/admin-icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/admin-icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'admin-sw.js',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectManifest: {
        rollupFormat: 'iife',
        globPatterns: ['admin/**/*.{html,js,css}']
      }
    })
  ],
  server: {
    port: 5173,
    headers: {
      'Service-Worker-Allowed': '/'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html')
      }
    }
  }
});
