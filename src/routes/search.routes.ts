import { Hono } from 'hono';
import { getDatabase } from '../db/schema';

const search = new Hono();

search.get('/', async (c) => {
    try {
        const q = c.req.query('q')?.trim();
        if (!q) {
            return c.json({ success: true, data: [] });
        }

        const db = getDatabase();

        const rows: any[] = db
            .prepare(`
                SELECT a.verse_key, a.text_uthmani, t.translation,
                       s.english_name, s.number as surah_number
                FROM translations t
                JOIN ayahs a ON t.ayah_id = a.id
                JOIN surahs s ON a.surah_id = s.id
                WHERE t.translation LIKE ?
                ORDER BY s.number, a.ayah_number
                LIMIT 50
            `)
            .all(`%${q}%`);

        db.close();

        const results = rows.map((row) => ({
            verseKey: row.verse_key,
            textUthmani: row.text_uthmani,
            translation: row.translation,
            surahEnglishName: row.english_name,
            surahNumber: row.surah_number,
        }));

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Search failed' }, 500);
    }
});

export default search;
