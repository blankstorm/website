import type { AstroCookies, AstroGlobal } from 'astro';
import { type Account, getAccount, auth, AccountType, Access } from '@blankstorm/api';

export async function currentUser(cookies: AstroCookies): Promise<Account | undefined> {
	if (!cookies.has('token')) {
		return;
	}
	const token = cookies.get('token')?.value;
	auth(token);
	try {
		return await getAccount('token', token || '', Access.PROTECTED);
	} catch (e) {
		return;
	}
}

export async function parseBody<V extends Record<string, FormDataEntryValue>>(request: Request): Promise<V> {
	switch (request.headers.get('Content-Type')) {
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

export async function checkAdminAuth(astro: Readonly<AstroGlobal>, minType?: AccountType): Promise<Account | Response> {
	const account = await currentUser(astro.cookies);

	minType ||= 1; // to prevent 0 from being passed

	if (!account) {
		return astro.redirect('/login');
	}

	if (account.type < minType) {
		astro.response.status = 403;
	}

	return account;
}

export const formatNum = Intl.NumberFormat('en', { notation: 'compact' }).format;
export function formatBytes(bytes: number): string {
	const unit = Math.floor(Math.log10(bytes) / 3);
	const adjusted = bytes / 10 ** (3 * unit);
	return adjusted.toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][unit];
}
