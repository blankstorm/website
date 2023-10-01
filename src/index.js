import { parseArgs } from 'node:util';
import express from 'express';
import { handler as ssrHandler } from '../dist/blankstorm.net/dist/server/entry.mjs';
//import { handler as apiHandler } from '../dist/api.blankstorm.net/dist/server/entry.mjs';
import compression from 'compression';

const { values: flags } = parseArgs({
	config: {
		localhost: { short: 'l', type: 'boolean', default: false },
	},
});

/*const handlers = new Map();
handlers.set('default', ssrHandler);
handlers.set('blankstorm.net', ssrHandler);
handlers.set('api.blankstorm.net', apiHandler);*/

const app = express();
app.use(compression());
app.use('/', express.static('dist/blankstorm.net/dist/client/'));
app.use(ssrHandler);
//app.use('/', express.static(`dist/api.blankstorm.net/dist/client/`));
//app.use(apiHandler);

app.listen(80);
