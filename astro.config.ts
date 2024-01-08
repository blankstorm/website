import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
	output: 'server',
	adapter: cloudflare({
		mode: 'directory',
		runtime: { mode: 'local', type: 'pages' }
	}),
	site: 'https://blankstorm.net',
	redirects: {
		'/yt': 'https://www.youtube.com/channel/UCN-3Jifrsg2GwDN8vxTlWrQ',
		'/discord': 'https://discord.com/invite/ZyTsVR4NCV',
		'/v': '/releases',
		'/play': '/download',
		'/versions': '/releases',
		'/changelog': '/releases',
		'/bugs': 'https://github.com/blankstorm/blankstorm/issues',
		'/docs': 'https://github.com/blankstorm/blankstorm/wiki',
		
	},
	markdown: {
		shikiConfig: {
			theme: 'monokai',
		},
	},
});
