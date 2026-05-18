import { Hono } from 'hono';
import { getDatabase } from '../db/schema';
import type { Surah } from '../types';
import { normalizeArabic } from '../utils';

const surahsRoutes = new Hono();

surahsRoutes.get('/', async (c) => {
    try {
        const db = getDatabase();
        const rows: any[] = db
            .prepare('SELECT * FROM surahs ORDER BY number')
            .all();
        db.close();

        const allSurahs: Surah[] = rows.map((row) => ({
            number: row.number,
            name: row.name,
            englishName: row.english_name,
            englishTranslation: row.english_translation,
            arabicName: row.arabic_name,
            revelationType: row.revelation_type,
            totalAyahs: row.total_ayahs,
            bismillahPre: row.bismillah_pre === 1,
        }));

        const q = c.req.query('q')?.trim() ?? '';
        const qLower = q.toLowerCase();
        const qNorm = normalizeArabic(q);

        const results = q
            ? allSurahs.filter((s) => {
                  const nameNorm = normalizeArabic(s.name);
                  return (
                      s.englishName.toLowerCase().includes(qLower) ||
                      s.englishTranslation.toLowerCase().includes(qLower) ||
                      nameNorm.includes(qNorm)
                  );
              })
            : allSurahs;

        return c.json({ success: true, data: results, allSurahs });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to load surahs' }, 500);
    }
});

export default surahsRoutes;
