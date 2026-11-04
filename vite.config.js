import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devCsp = {
  name: 'dev-csp',
  apply: 'serve',
  transformIndexHtml(html) {
    return html.replace("connect-src 'self';", "connect-src 'self' ws://localhost:5173;");
  },
};

export default defineConfig({
  plugins: [react(), devCsp],
  base: './',
});
