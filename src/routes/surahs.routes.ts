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

        return c.json({ success: true, data: results });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to load surahs' }, 500);
    }
});

surahsRoutes.get('/:surahNumber', async (c) => {
    try {
        const surahNumber = parseInt(c.req.param('surahNumber'));
        if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
            return c.json({ success: false, error: 'Invalid surah number' }, 400);
        }

        const db = getDatabase();
        const surah: any = db.prepare('SELECT * FROM surahs WHERE number = ?').get(surahNumber);
        if (!surah) {
            db.close();
            return c.json({ success: false, error: 'Surah not found' }, 404);
        }

        const ayahs: any[] = db.prepare('SELECT * FROM ayahs WHERE surah_id = ? ORDER BY ayah_number').all(surah.id);

        for (const ayah of ayahs) {
            ayah.translation = db.prepare('SELECT translation, translation_name FROM translations WHERE ayah_id = ?').get(ayah.id);
            ayah.audio = db.prepare('SELECT * FROM audio WHERE ayah_id = ?').get(ayah.id);
            if (ayah.audio) {
                ayah.audio.segments = db.prepare('SELECT word_index, start_time, end_time FROM ayah_audio_segments WHERE audio_id = ? ORDER BY segment_index').all(ayah.audio.id);
            }
            ayah.words = db.prepare('SELECT * FROM words WHERE ayah_id = ? ORDER BY position').all(ayah.id);
            for (const word of ayah.words) {
                word.audioSegment = db.prepare('SELECT word_index, start_time, end_time FROM word_audio_segments WHERE word_id = ?').get(word.id);
                if (word.audioSegment) {
                    word.audioSegment.wordIndex = word.audioSegment.word_index;
                    word.audioSegment.startTime = word.audioSegment.start_time;
                    word.audioSegment.endTime = word.audioSegment.end_time;
                    delete word.audioSegment.word_index;
                    delete word.audioSegment.start_time;
                    delete word.audioSegment.end_time;
                }
            }
        }

        const audio: any[] = db.prepare(`
            SELECT a.ayah_number, au.audio_url, au.duration, au.reciter
            FROM audio au
            JOIN ayahs a ON au.ayah_id = a.id
            WHERE a.surah_id = ?
            ORDER BY a.ayah_number
        `).all(surah.id);

        db.close();

        return c.json({
            success: true,
            data: {
                ayahs,
                audio,
            },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to load surah' }, 500);
    }
});

export default surahsRoutes;
