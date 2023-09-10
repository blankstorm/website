import { defineConfig } from 'astro/config';
import shared from './astro.config';

export default defineConfig({
	...shared,
	site: 'https://api.blankstorm.net',
	srcDir: 'src/api.blankstorm.net',
	outDir: 'dist/api.blankstorm.net',
});
