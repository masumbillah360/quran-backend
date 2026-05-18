import { Hono } from 'hono'
import { getDatabase } from './db/schema';
import surahRoutes from './routes/surahs.routes';
import ayahRoutes from './routes/ayahs.routes';

const app = new Hono()

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono'
]

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
app.route('/api/v1/surahs', surahRoutes);
app.route('/api/v1/ayahs', ayahRoutes);

export default app
