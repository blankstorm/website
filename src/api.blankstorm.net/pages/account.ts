import type { APIRoute } from 'astro';
import { error, response, auth, parseError } from '../utils';
import { StatusCodes } from 'http-status-codes';
import { hash, users } from '../../api';
import { type FullAccount, account } from '@blankstorm/api';

export const ALL: APIRoute = async ({ request }) => {
	try {
		const contentType = request.headers.get('Content-Type') ?? '';
		if (request.headers.has('Content-Type') && !['text/json', 'application/json'].includes(contentType)) {
			return response(StatusCodes.BAD_REQUEST, 'Content-Type "' + contentType + '" not supported');
		}

		const body = await request.json();

		let action = body.action || request.method.toLowerCase();
		if (action == 'put') action = 'create';
		if (action == 'post') action = 'set';

		let targetUser: FullAccount;
		if (!['create', 'login'].includes(action)) {
			if (!(body.id || body.token)) return error(StatusCodes.BAD_REQUEST, 'Missing id or token');

			targetUser = await users.getOne(body.token ? 'token' : 'id', body.token || body.id);

			if (!targetUser) return error(StatusCodes.NOT_FOUND, 'Target user does not exist');

			targetUser.disabled = !!targetUser.disabled;
		}

		let _authResponse: Response | void;

		switch (action) {
			case 'get':
				return response(StatusCodes.OK, account.stripInfo(targetUser));
			case 'create':
				for (let param of ['username', 'email', 'password']) {
					if (!body[param]) return error(StatusCodes.BAD_REQUEST, 'Missing parameter: ' + param);
				}

				let newUser;
				try {
					newUser = await users.create(body.username, body.email, body.password);
				} catch (err) {
					return parseError(err);
				}

				return response(StatusCodes.CREATED, account.stripInfo(newUser));
			case 'delete':
				_authResponse = await auth(body.auth, Math.max(targetUser.oplvl, 3));
				if (_authResponse) return _authResponse;

				users.delete(targetUser.id, body.reason);

				return response(StatusCodes.OK);
			case 'set':
				for (let param of ['key', 'value']) {
					if (!(param in body)) return error(StatusCodes.BAD_REQUEST, 'Missing parameter: ' + param);
				}

				switch (body.key) {
					case 'username':
					case 'email':
						_authResponse = await auth(body.auth, 2);
						break;
					case 'disabled':
						_authResponse = await auth(body.auth, targetUser.oplvl);
						break;
					case 'oplvl':
						_authResponse = await auth(body.auth, Math.max(targetUser.oplvl, 3));
						break;
					default:
				}

				if (_authResponse) return _authResponse;

				try {
					await users.set(targetUser.id, body.key, body.value, body.reason);
				} catch (err) {
					return parseError(err);
				}

				return response(StatusCodes.OK, account.stripInfo(targetUser));

			case 'login':
				for (let param of ['email', 'password']) {
					if (!body[param]) return error(StatusCodes.BAD_REQUEST, `Missing ${param} in body`);
				}

				targetUser = await users.getOne('email', body.email);

				const password = hash(body.password);
				if (!targetUser) return error(StatusCodes.GONE, 'Target user does not exist');
				if (password != targetUser?.password) return error(StatusCodes.CONFLICT, 'Incorrect password');

				let token;
				try {
					token = await users.login(targetUser.id);
				} catch (err) {
					return parseError(err);
				}
				return response(StatusCodes.OK, { ...account.stripInfo(targetUser), token });
			case 'logout':
				if (!body.token) {
					_authResponse = await auth(body.auth, Math.max(targetUser.oplvl, 1));
					if (_authResponse) return _authResponse;
				}

				try {
					token = await users.logout(targetUser.id, body.reason);
				} catch (err) {
					return parseError(err);
				}

				return response(StatusCodes.OK, account.stripInfo(targetUser));
			default:
				return error(StatusCodes.METHOD_NOT_ALLOWED, 'Action is not allowed');
		}
	} catch (err) {
		return error(StatusCodes.INTERNAL_SERVER_ERROR);
	}
};
