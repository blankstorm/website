import express from 'express';
import { handler as ssrHandler } from '../dist/server/entry.mjs';
//import { handler as apiHandler } from '../dist/api.blankstorm.net/dist/server/entry.mjs';
import compression from 'compression'

const handlers = new Map();
handlers.set('default', ssrHandler);
handlers.set('blankstorm.net', ssrHandler);
//handlers.set('api.blankstorm.net', apiHandler);

const app = express();
//app.use(compression());
app.use('/', express.static('dist/client/'));
//app.use('/', express.static(`dist/api.blankstorm.net/dist/client/`));
app.use(ssrHandler);
/*app.all('*', (req, res) => {
	const hostname = handlers.has(req.hostname) ? req.hostname : 'blankstorm.net';

	if (!handlers.has(hostname)) {
		return res.status(404).send('Domain not found');
	}
	
	console.debug(`Handling: ${req.method} ${req.url} using ${hostname}`);
	const handler = handlers.get(hostname);
	return handler({ ...req, hostname: hostname }, res);
});*/

app.listen(3000);