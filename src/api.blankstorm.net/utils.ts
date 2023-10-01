import { account, type FullAccount } from '@blankstorm/api';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { SqlError } from 'mariadb';
import { users } from '../api';

export function response<R extends string | object>(status: StatusCodes = StatusCodes.OK, result?: R, error = false): Response {
	const statusText: ReasonPhrases = ReasonPhrases[StatusCodes[status] as keyof typeof ReasonPhrases];
	return new Response(typeof result == 'string' ? result : JSON.stringify({ status, statusText, result, error }), { status, statusText });
}

export function error(status: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR, message?: string): Response {
	return response(status, message, true);
}

export async function auth(authToken: string, type: account.Type = account.Type.ACCOUNT, target?: FullAccount, allowIfSame = false): Promise<Response | void> {
	try {
		if (!authToken) return error(StatusCodes.UNAUTHORIZED, 'Missing auth token');

		const authUser = await users.getOne('token', authToken);

		if (!authUser) return error(StatusCodes.UNAUTHORIZED, 'Invalid auth token');

		if (authUser.oplvl < type && (target.id == authUser.id && !allowIfSame)) return error(StatusCodes.FORBIDDEN, 'Permission denied');
	} catch (err) {
		return error(StatusCodes.INTERNAL_SERVER_ERROR, 'Authorization failed');
	}
}

export function parseError(err: Error): Response {
	return error(err instanceof SqlError ? StatusCodes.INTERNAL_SERVER_ERROR : StatusCodes.BAD_REQUEST, err.message);
}
