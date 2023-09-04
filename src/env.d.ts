/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly db: {
		name: string,
		user: string,
		password: string
	};
  }