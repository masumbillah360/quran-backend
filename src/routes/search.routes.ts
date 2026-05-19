import { Hono } from 'hono'
import { normalizeArabic } from '../utils'
import type { SearchResult } from '../types'

const searchRoutes = new Hono<{ Bindings: CloudflareBindings }>()

searchRoutes.get('/', async (c) => {
    try {
        const q = c.req.query('q')?.trim()
        if (!q) {
            return c.json({ success: true, data: [] })
        }

        const db = c.env['holy-quran']
        const results: SearchResult[] = []

        const qLower = q.toLowerCase()
        const qNorm = normalizeArabic(q)

        const surahsResult = await db
            .prepare('SELECT * FROM surahs ORDER BY number')
            .all()

        for (const surah of (surahsResult.results as any[])) {
            const nameNorm = normalizeArabic(surah.name)
            const matchesName =
                surah.english_name.toLowerCase().includes(qLower) ||
                surah.english_translation.toLowerCase().includes(qLower) ||
                nameNorm.includes(qNorm)

            if (matchesName) {
                results.push({
                    type: 'surah',
                    surahNumber: surah.number,
                    surahEnglishName: surah.english_name,
                    surahArabicName: surah.name,
                    matchType: nameNorm.includes(qNorm) ? 'name' : 'english',
                })
            }
        }

        const ayahsResult = await db
            .prepare(`
                SELECT a.verse_key, a.ayah_number, a.text_indopak, a.text_uthmani,
                       t.translation, s.number as surah_number, s.english_name as surah_english,
                       s.name as surah_arabic
                FROM translations t
                JOIN ayahs a ON t.ayah_id = a.id
                JOIN surahs s ON a.surah_id = s.id
                WHERE t.translation LIKE ?
                ORDER BY s.number, a.ayah_number
                LIMIT 50
            `)
            .bind(`%${q}%`)
            .all()

        for (const row of (ayahsResult.results as any[])) {
            const arabicText = row.text_indopak || row.text_uthmani || ''
            const arabicNorm = normalizeArabic(arabicText)
            const matchesArabic = arabicNorm.includes(qNorm)

            results.push({
                type: 'ayah',
                surahNumber: row.surah_number,
                surahEnglishName: row.surah_english,
                surahArabicName: row.surah_arabic,
                ayahNumber: row.ayah_number,
                verseKey: row.verse_key,
                arabicText: arabicText || undefined,
                translation: row.translation || undefined,
                matchType: matchesArabic ? 'arabic' : 'translation',
            })
        }

        return c.json({ success: true, data: results })
    } catch (error) {
        console.error('Search error:', error)
        return c.json({ success: false, error: 'Search failed' }, 500)
    }
})

export default searchRoutes
