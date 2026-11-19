import {defineConfig} from 'vite';
// Komanda npm run build pravi statičke stranice i datoteke za Cloudflare Pages.
export default defineConfig({server:{port:5173,strictPort:true}});
