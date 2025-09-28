import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupBot } from './bot.js';
import routes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

app.use('/api', routes);
app.use('/', express.static(path.join(__dirname, '../webapp')));

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await setupBot();
  console.log('Server listening on', PORT);
});
