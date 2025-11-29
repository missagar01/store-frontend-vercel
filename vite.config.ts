import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	// Use relative asset paths so static hosting (e.g., S3 website endpoints) serves files correctly
	base: './',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		}
	}
});
