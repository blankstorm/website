import type { AstroCookies } from 'astro';
import { users } from './api';
import type { FullAccount } from '@blankstorm/api';

export async function currentUser(cookies: AstroCookies): Promise<FullAccount | undefined> {
	if(!cookies.has('token')) {
		return;
	}
	return await users.getOne('token', cookies.get('token')?.value || '');
}

export async function parseBody<V extends Record<string, FormDataEntryValue>>(request: Request): Promise<V> {
	switch(request.headers.get('Content-Type')) {
		case 'application/json':
			return request.json();
		case 'application/x-www-form-urlencoded':
			const formData = await request.formData();
			return Object.fromEntries(formData.entries()) as V;
		default:
			const text = await request.text();
			return JSON.parse(text);
	}
}