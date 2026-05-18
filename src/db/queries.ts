import { getDatabase } from './schema';

/**
 * Get all surahs
 */
export function getAllSurahs() {
    const db = getDatabase();
    const surahs = db.prepare('SELECT * FROM surahs ORDER BY number').all();
    db.close();
    return surahs;
}

/**
 * Get surah with all ayahs
 */
export function getSurahFull(surahNumber: number) {
    const db = getDatabase();

    const surah: any = db
        .prepare('SELECT * FROM surahs WHERE number = ?')
        .get(surahNumber);
    if (!surah) {
        db.close();
        return null;
    }

    const ayahs: any = db
        .prepare('SELECT * FROM ayahs WHERE surah_id = ? ORDER BY ayah_number')
        .all(surah.id);

    for (const ayah of ayahs) {
        ayah.translation = db
            .prepare(
                'SELECT translation, translation_name FROM translations WHERE ayah_id = ?',
            )
            .get(ayah.id);

        ayah.audio = db
            .prepare('SELECT * FROM audio WHERE ayah_id = ?')
            .get(ayah.id);
        if (ayah.audio) {
            ayah.audio.segments = db
                .prepare(
                    'SELECT word_index, start_time, end_time FROM ayah_audio_segments WHERE audio_id = ? ORDER BY segment_index',
                )
                .all(ayah.audio.id);
        }

        ayah.words = db
            .prepare('SELECT * FROM words WHERE ayah_id = ? ORDER BY position')
            .all(ayah.id);
        for (const word of ayah.words) {
            word.audioSegment = db
                .prepare(
                    'SELECT word_index, start_time, end_time FROM word_audio_segments WHERE word_id = ?',
                )
                .get(word.id);
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

    db.close();

    return {
        surahNumber: surah.number,
        name: surah.name,
        englishName: surah.english_name,
        englishTranslation: surah.english_translation,
        arabicName: surah.arabic_name,
        revelationType: surah.revelation_type,
        totalAyahs: surah.total_ayahs,
        bismillahPre: surah.bismillah_pre === 1,
        ayahs,
    };
}

/**
 * Get single ayah by verse key (e.g., "2:255")
 */
export function getAyahByKey(verseKey: string) {
    const db = getDatabase();

    const ayah: any = db
        .prepare(
            `
        SELECT a.*, s.english_name as surah_name, s.number as surah_number
        FROM ayahs a
        JOIN surahs s ON a.surah_id = s.id
        WHERE a.verse_key = ?
    `,
        )
        .get(verseKey);

    if (!ayah) {
        db.close();
        return null;
    }

    ayah.translation = db
        .prepare(
            'SELECT translation, translation_name FROM translations WHERE ayah_id = ?',
        )
        .get(ayah.id);

    ayah.audio = db
        .prepare('SELECT * FROM audio WHERE ayah_id = ?')
        .get(ayah.id);
    if (ayah.audio) {
        ayah.audio.segments = db
            .prepare(
                'SELECT word_index, start_time, end_time FROM ayah_audio_segments WHERE audio_id = ? ORDER BY segment_index',
            )
            .all(ayah.audio.id);
    }

    ayah.words = db
        .prepare('SELECT * FROM words WHERE ayah_id = ? ORDER BY position')
        .all(ayah.id);
    for (const word of ayah.words) {
        word.audioSegment = db
            .prepare(
                'SELECT word_index, start_time, end_time FROM word_audio_segments WHERE word_id = ?',
            )
            .get(word.id);
        if (word.audioSegment) {
            word.audioSegment.wordIndex = word.audioSegment.word_index;
            word.audioSegment.startTime = word.audioSegment.start_time;
            word.audioSegment.endTime = word.audioSegment.end_time;
            delete word.audioSegment.word_index;
            delete word.audioSegment.start_time;
            delete word.audioSegment.end_time;
        }
    }

    db.close();
    return ayah;
}

/**
 * Search translations
 */
export function searchTranslation(searchTerm: string) {
    const db = getDatabase();
    const results = db
        .prepare(
            `
        SELECT a.verse_key, a.text_uthmani, t.translation, s.english_name, s.number as surah_number
        FROM translations t
        JOIN ayahs a ON t.ayah_id = a.id
        JOIN surahs s ON a.surah_id = s.id
        WHERE t.translation LIKE ?
        ORDER BY s.number, a.ayah_number
        LIMIT 50
    `,
        )
        .all(`%${searchTerm}%`);
    db.close();
    return results;
}

/**
 * Get ayahs by page
 */
export function getAyahsByPage(page: number) {
    const db = getDatabase();
    const results = db
        .prepare(
            `
        SELECT a.id, a.verse_key, a.text_uthmani, a.text_indopak, a.text_simple,
               a.page_number, a.juz_number, a.hizb_number, a.rub_number, a.sajdah_type,
               t.translation, t.translation_name, s.english_name
        FROM ayahs a
        LEFT JOIN translations t ON a.id = t.ayah_id
        LEFT JOIN surahs s ON a.surah_id = s.id
        WHERE a.page_number = ?
        ORDER BY a.id
    `,
        )
        .all(page);
    db.close();
    return results;
}

/**
 * Database stats
 */
export function getStats() {
    const db: any = getDatabase();
    const stats = {
        surahs: db.prepare('SELECT COUNT(*) as c FROM surahs').get().c,
        ayahs: db.prepare('SELECT COUNT(*) as c FROM ayahs').get().c,
        words: db.prepare('SELECT COUNT(*) as c FROM words').get().c,
        translations: db.prepare('SELECT COUNT(*) as c FROM translations').get()
            .c,
        audio: db.prepare('SELECT COUNT(*) as c FROM audio').get().c,
        ayahAudioSegments: db
            .prepare('SELECT COUNT(*) as c FROM ayah_audio_segments')
            .get().c,
        wordAudioSegments: db
            .prepare('SELECT COUNT(*) as c FROM word_audio_segments')
            .get().c,
    };
    db.close();
    return stats;
}

// Run directly to test
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('\n📊 Database Stats:\n', getStats());
    console.log(
        '\n🔍 Sample Ayah 1:1:\n',
        JSON.stringify(getAyahByKey('1:1'), null, 2).substring(0, 1000),
    );
}
