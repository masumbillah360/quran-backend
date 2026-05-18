import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { getSurahFull } from '../db/queries';

const ayahs = new Hono();

ayahs.get('/:surahNumber', async (c) => {
    try {
        const surahNumber = parseInt(c.req.param('surahNumber'));

        if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
            return c.json(
                { success: false, error: 'Invalid surah number' },
                400,
            );
        }

        const detail = getSurahFull(surahNumber);

        if (!detail) {
            return c.json({ success: false, error: 'Surah not found' }, 404);
        }

        const { ayahs, ...meta } = detail;

        if (c.req.query('stream') === 'true') {
            c.header('Content-Type', 'application/x-ndjson');
            return stream(c, async (s) => {
                await s.writeln(JSON.stringify({ type: 'meta', data: meta }));
                for (const ayah of ayahs) {
                    await s.writeln(
                        JSON.stringify({ type: 'ayah', data: ayah }),
                    );
                }
                await s.writeln(JSON.stringify({ type: 'complete' }));
            });
        }

        return c.json({
            success: true,
            data: { meta, ayahs },
        });
    } catch (error) {
        return c.json({ success: false, error: 'Failed to load surah' }, 500);
    }
});

export default ayahs;
