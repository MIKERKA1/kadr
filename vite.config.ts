import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/; the deploy workflow passes that prefix.
export default defineConfig({
  base: process.env.BASE_PATH ? `${process.env.BASE_PATH.replace(/\/$/, '')}/` : '/',
});
