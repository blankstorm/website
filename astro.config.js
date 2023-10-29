import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
	output: 'server',
	adapter: node({
		mode: 'middleware',
	}),
	site: 'https://blankstorm.net',
	redirects: {
		'/yt': 'https://www.youtube.com/channel/UCN-3Jifrsg2GwDN8vxTlWrQ',
		'/discord': 'https://discord.com/invite/ZyTsVR4NCV',
		'/v': '/versions',
		'/play': '/download',
		'/versions': '/changelog',
		'/bugs': 'https://github.com/dr-vortex/blankstorm/issues',
		'/docs': 'https://github.com/dr-vortex/blankstorm/wiki',
	},
	markdown: {
		shikiConfig: {
			theme: 'monokai',
		},
	},
});