import { randomBytes, createHash } from 'crypto';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { SqlError } from 'mariadb';
import db from './db';
import sgMail from '@sendgrid/mail';
import type { Account, FullAccount, Response, account } from '@blankstorm/api';
export type * as api from '@blankstorm/api';

export function hash(text: string): string {
	const _hash = createHash('sha256');
	_hash.update(text);
	return _hash.digest('hex');
}

/**
 * Returns if an attribute is valid
 */
export function isValid(attr: string, val: string): boolean {
	switch (attr) {
		case 'id':
			return /^[0-9a-f]{32}$/.test(val);
		case 'username':
			return /^[_0-9a-zA-Z]{3,20}$/.test(val);
		case 'email':
			return /^[a-zA-Z0-9.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9]{2,5}){1,2}$/.test(val);
		case 'password':
			try {
				hash(val);
				return true;
			} catch (e) {
				return false;
			}
		case 'lastchange':
		case 'created':
			try {
				return Date.parse(val) < Date.now();
			} catch (e) {
				return false;
			}
		case 'token':
		case 'session':
			return /[0-9a-f]{64}/.test(val);
		case 'disabled':
			return [true, false, 1, 0, 'true', 'false'].some(v => v === val);
		default:
			return false;
	}
}

/**
 * Checks if an attribute in valid (throws when it is not)
 */
export function checkValid(attr: string, val: string): void {
	switch (attr) {
		case 'id':
			if (val.length != 32) throw new Error('Invalid ID length');
			if (!/^[0-9a-f]+$/.test(val)) throw new Error('Invalid ID');
			break;
		case 'username':
			if (val.length < 3 || val.length > 20) throw new Error('Invalid username. Usernames must be between 3 and 20 characters.');
			if (!/^[_0-9a-zA-Z]+$/.test(val)) throw new Error('Invalid username. Usernames can only contain letters, numbers, and underscores');
			break;
		case 'email':
			if (!/^[\w.-]+@[\w-]+(\.\w{2,5}){1,2}$/.test(val)) throw new Error('Invalid email');
			break;
		case 'password':
			try {
				hash(val);
			} catch (e) {
				throw new Error('Password could not be hashed');
			}
			break;
		case 'lastchange':
		case 'created':
			if (Date.parse(val) > Date.now()) {
				throw new Error('Date is in the future');
			}
			break;
		case 'token':
		case 'session':
			if (val.length != 64) throw new Error('Invalid token or session');
			if (!/^[0-9a-f]+$/.test(val)) throw new Error('Invalid token or session');
			break;
		case 'disabled':
			if (![true, false, 1, 0, 'true', 'false'].some(v => v === val)) throw new Error('Invalid disabled value');
			break;
		default:
			throw new TypeError(`"${attr}" is not a user attribute`);
	}
}

export function response<R extends string | object>(status: StatusCodes = StatusCodes.OK, result: R, error = false): Response<R> {
	const statusText: ReasonPhrases = ReasonPhrases[StatusCodes[status] as keyof typeof ReasonPhrases];
	return { status, statusText, result, error };
}

export function error(status = StatusCodes.INTERNAL_SERVER_ERROR, message = '', res?: ResponseInit) {
	if (res) {
		res.status = status;
	}
	return response(status, message, true);
}

export function parseError(err: Error, res: ResponseInit) {
	return error(err instanceof SqlError ? StatusCodes.INTERNAL_SERVER_ERROR : StatusCodes.BAD_REQUEST, err.message, res);
}

export function getAccountRole(type: account.Type, short?: boolean): string {
	switch (type) {
		case 0:
			return 'User';
		case 1:
			return short ? 'Mod' : 'Moderator';
		case 2:
			return short ? 'Dev' : 'Developer';
		case 3:
			return short ? 'Admin' : 'Administrator';
		case 4:
			return 'Owner';
		default:
			return 'Unknown' + short ? '' : `(${type})`;
	}
}

export function sendMail(to: string, subject: string, contents: string) {
	return sgMail.send({
		from: 'Blankstorm <no-reply@drvortex.dev>',
		to,
		subject,
		html: '<p style="font-family:sans-serif">' + contents.replaceAll('\n', '<br>') + '</p>',
	});
}

export function sendMailToUser({ username, email }: { username: string, email?: string }, subject: string, contents: string) {
	if(!email) {
		throw 'Missing email';
	}
	return sendMail(`${username} <${email}>`, subject, `${username},\n\n${contents}\n\nBest,\nThe Blankstorm dev team`);
}

/**
 * The collection of users in the accounts table
 */
export const users = {
	async count(): Promise<number> {
		const result = await db.query('select count(1) as num from accounts');
		return result[0].num;
	},
	async getOne(attr: string, value: string): Promise<FullAccount> {
		const result = await this.get(attr, value, 0, 1);
		return result[0];
	},
	async get(attr: string, value: string, offset = 0, limit = 1000): Promise<FullAccount[]> {
		if (!value) {
			return [];
		}
		const results = await db.query(`select * from accounts where ${attr}=? limit ?,?`, [value, offset, limit]);
		for (const result of results) {
			result.disabled = !!result.disabled;
		}
		return results;
	},
	async getAll(offset = 0, limit = 1000): Promise<FullAccount[]> {
		const results = await db.query('select * from accounts limit ?,?', [offset, limit]);
		for (const result of results) {
			result.disabled = !!result.disabled;
		}
		return results;
	},
	async getAllWithMinType(type: account.Type = 4, offset = 0, limit = 1000): Promise<FullAccount[]> {
		const results = await db.query('select * from accounts where oplvl >= ? limit ?,?', [type, offset, limit]);
		for (const result of results) {
			result.disabled = !!result.disabled;
		}
		return results;
	},
	async set(id: string, attr: string, value: string, reason?: string): Promise<void> {
		if (!isValid(attr, value)) {
			throw 'Invalid key or value';
		}

		const user = await this.getOne('id', id);
		if(!user){
			return;
		}
		switch (attr) {
			case 'username':
				const date = new Date(Date.now());
				db.query('update accounts set lastchange=? where id=?', [date, id]);
				break;
			case 'disabled':
				await sendMailToUser(
					user,
					'Account ' + (value ? 'disabled' : 'enabled'),
					`Your account has been ${value ? 'disabled' : 'enabled'}.\nReason: ${reason || '<em>no reason provided</em>'}`
				);
				break;
			case 'email':
				await sendMailToUser(
					user,
					'Email changed',
					`Your email has been changed to ${value}. If this was not you, you should change your password and contact support@drvortex.dev.`
				);
				break;
		}

		return await db.query(`update accounts set ${attr}=? where id=?`, [value, id]);
	},
	async create(username: string, email: string, rawPassword: string) {
		checkValid('username', username);
		checkValid('email', email);
		checkValid('password', rawPassword);

		if ((await this.get('username', username)).length) {
			throw new ReferenceError('User with username already exists');
		}

		if ((await this.get('email', email)).length) {
			throw new ReferenceError('User with email already exists');
		}

		const id = randomBytes(16).toString('hex');
		const password = hash(rawPassword);
		const date = new Date(Date.now());

		if ((await this.get('id', id)).length) {
			throw new ReferenceError('User with id already exists');
		}

		await db.query('insert into accounts (id,username,email,password,oplvl,created,lastchange) values (?,?,?,?,0,?,?)', [id, username, email, password, date, date]);

		await sendMailToUser(
			{ username, email },
			'Welcome to Blankstorm',
			`Thank you for joining Blankstorm! The game is still in development, so not all the features are completly finished.
			Make sure you've joined <a href='https://bs.drvortex.dev/discord'>the discord</a> for the latest news!`
		);

		return {
			id,
			disabled: false,
			username,
			email,
			password,
			oplvl: 0,
			created: date,
			lastchange: date,
		};
	},
	async has(id: string) {
		const result = await db.query('select count(1) as num from accounts where id=?', [id]);
		return !!result[0].num;
	},
	async delete(id: string, reason?: string) {
		if (!this.has(id)) {
			throw new ReferenceError('User does not exist');
		}

		const user = await this.getOne('id', id);
		await sendMailToUser(
			user,
			'Account deleted',
			`Your account has been deleted.
			Reason: ${reason || '<em>no reason provided</em>'}
			If you have any concerns please reach out to support@drvortex.dev.`
		);

		return await db.query('delete from accounts where id=?', [id]);
	},
	async login(id: string) {
		const token = randomBytes(32).toString('hex');
		await db.query('update accounts set token=? where id=?', [token, id]);
		return token;
	},
	logout(id: string) {
		return db.query('update accounts set token="" where id=?', [id]);
	},
	async generateSession(id: string) {
		const session = randomBytes(32).toString('hex');
		await db.query('update accounts set session=? where id=?', [session, id]);
		return session;
	},

	reduce(user: Account): Account {
		return {
			id: user?.id,
			username: user?.username,
			oplvl: user?.oplvl,
			lastchange: user?.lastchange,
			created: user?.created,
			disabled: user?.disabled,
		};
	},
};
