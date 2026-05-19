import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import surahRoutes from './routes/surahs.routes'
import searchRoutes from './routes/search.routes'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://quran-frontend-six.vercel.app'],
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

app.use('/api/*', cache({
  cacheName: 'quran-api',
  cacheControl: 'max-age=3600',
}))

app.get('/', (c) => c.text('Quran API - Cloudflare Workers'))

app.route('/api/surahs', surahRoutes)
app.route('/api/search', searchRoutes)

export default app
