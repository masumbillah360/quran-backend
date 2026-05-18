import { Hono } from 'hono'
import { getDatabase } from './db/schema';
import surahRoutes from './routes/surahs.routes';
import ayahRoutes from './routes/ayahs.routes';
import searchRoutes from './routes/search.routes';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono()

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono'
]
app.use('*', logger());
app.use(
    '*',
    cors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://*.vercel.app',
            'https://*.netlify.app',
        ],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
    }),
);
app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

app.get('/test', async (c) => {
    const db = getDatabase();
    let countQuery = 'SELECT COUNT(*) as total FROM surahs';
    const count: any = db.prepare(countQuery).get();
    db.close();
    return c.text(`DB hit's successfully : ${count.total}`);
});

// Routes
app.route('/api/surahs', surahRoutes);
app.route('/api/ayahs', ayahRoutes);
app.route('/api/search', searchRoutes);

export default app
