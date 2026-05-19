import { Hono } from 'hono'
import { normalizeArabic } from '../utils'
import type { SurahMeta, SurahData, AyahData, WordData, AyahAudio } from '../types'

const surahRoutes = new Hono<{ Bindings: CloudflareBindings }>()

surahRoutes.get('/', async (c) => {
    try {
        const db = c.env['holy-quran']
        const { results } = await db.prepare('SELECT * FROM surahs ORDER BY number').all()

        const allSurahs: SurahMeta[] = (results as any[]).map((row) => ({
            number: row.number,
            name: row.name,
            englishName: row.english_name,
            englishNameTranslation: row.english_translation,
            numberOfAyahs: row.total_ayahs,
            revelationType: row.revelation_type,
        }))

        const q = c.req.query('q')?.trim() ?? ''
        const qLower = q.toLowerCase()
        const qNorm = normalizeArabic(q)

        const filtered = q
            ? allSurahs.filter((s) => {
                  const nameNorm = normalizeArabic(s.name)
                  return (
                      s.englishName.toLowerCase().includes(qLower) ||
                      s.englishNameTranslation.toLowerCase().includes(qLower) ||
                      nameNorm.includes(qNorm)
                  )
              })
            : allSurahs

        return c.json({ success: true, data: filtered })
    } catch (error) {
        return c.json({ success: false, error: 'Failed to load surahs' }, 500)
    }
})

surahRoutes.get('/:surahNumber', async (c) => {
    try {
        const surahNumber = parseInt(c.req.param('surahNumber'))
        if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
            return c.json({ success: false, error: 'Invalid surah number' }, 400)
        }

        const db = c.env['holy-quran']

        const surahResult = await db
            .prepare('SELECT * FROM surahs WHERE number = ?')
            .bind(surahNumber)
            .all()

        const surah = (surahResult.results as any[])[0]
        if (!surah) {
            return c.json({ success: false, error: 'Surah not found' }, 404)
        }

        const ayahsResult = await db
            .prepare('SELECT * FROM ayahs WHERE surah_id = ? ORDER BY ayah_number')
            .bind(surah.id)
            .all()

        const ayahRows = ayahsResult.results as any[]
        if (ayahRows.length === 0) {
            return c.json({ success: true, data: {
                surahNumber: surah.number,
                name: surah.name,
                englishName: surah.english_name,
                englishTranslation: surah.english_translation,
                arabicName: surah.arabic_name,
                revelationType: surah.revelation_type,
                totalAyahs: surah.total_ayahs,
                bismillahPre: surah.bismillah_pre === 1,
                ayahs: [],
            }})
        }

        const ayahIds = ayahRows.map((a: any) => a.id)

        const batchSize = 50
        const allTranslations: Record<number, any> = {}
        const allAudio: Record<number, any> = {}
        const allSegments: Record<number, any[]> = {}
        const allWords: Record<number, any[]> = {}
        const allWordSegments: Record<number, any> = {}

        for (let i = 0; i < ayahIds.length; i += batchSize) {
            const batch = ayahIds.slice(i, i + batchSize)
            const placeholders = batch.map(() => '?').join(',')

            const [translationsResult, audioResult, segmentsResult, wordsResult, wordSegResult] = await Promise.all([
                db.prepare(`SELECT * FROM translations WHERE ayah_id IN (${placeholders})`).bind(...batch).all(),
                db.prepare(`SELECT * FROM audio WHERE ayah_id IN (${placeholders})`).bind(...batch).all(),
                db.prepare(`SELECT * FROM ayah_audio_segments WHERE audio_id IN (SELECT id FROM audio WHERE ayah_id IN (${placeholders})) ORDER BY audio_id, segment_index`).bind(...batch).all(),
                db.prepare(`SELECT * FROM words WHERE ayah_id IN (${placeholders}) ORDER BY ayah_id, position`).bind(...batch).all(),
                db.prepare(`SELECT * FROM word_audio_segments WHERE word_id IN (SELECT id FROM words WHERE ayah_id IN (${placeholders}))`).bind(...batch).all(),
            ])

            for (const t of (translationsResult.results as any[])) {
                allTranslations[t.ayah_id] = t
            }
            for (const a of (audioResult.results as any[])) {
                allAudio[a.ayah_id] = a
            }
            for (const s of (segmentsResult.results as any[])) {
                if (!allSegments[s.audio_id]) allSegments[s.audio_id] = []
                allSegments[s.audio_id].push(s)
            }
            for (const w of (wordsResult.results as any[])) {
                if (!allWords[w.ayah_id]) allWords[w.ayah_id] = []
                allWords[w.ayah_id].push(w)
            }
            for (const ws of (wordSegResult.results as any[])) {
                allWordSegments[ws.word_id] = ws
            }
        }

        const ayahs: AyahData[] = ayahRows.map((ayahRow) => {
            const translation = allTranslations[ayahRow.id]
            const audio = allAudio[ayahRow.id]

            let audioData: AyahAudio = { url: '', duration: 0 }
            if (audio) {
                const segments = (allSegments[audio.id] || []).map(
                    (s: any) => [String(s.word_index), String(s.start_time), String(s.end_time)] as [string, string, string]
                )
                audioData = {
                    url: audio.audio_url,
                    duration: audio.duration,
                    segments: segments.length > 0 ? segments : undefined,
                }
            }

            const words: WordData[] = (allWords[ayahRow.id] || []).map((wordRow) => {
                const wordAudioSegment = allWordSegments[wordRow.id]
                const wordData: WordData = {
                    position: wordRow.position,
                    text: wordRow.text,
                    textIndopak: wordRow.text_indopak || undefined,
                    translation: wordRow.translation,
                    transliteration: wordRow.transliteration,
                    charType: wordRow.char_type || 'word',
                }
                if (wordAudioSegment) {
                    wordData.audioSegment = {
                        wordIndex: parseInt(wordAudioSegment.word_index),
                        startTime: wordAudioSegment.start_time,
                        endTime: wordAudioSegment.end_time,
                    }
                }
                return wordData
            })

            return {
                id: String(ayahRow.id),
                ayahNumber: ayahRow.ayah_number,
                verseKey: ayahRow.verse_key,
                textIndopak: ayahRow.text_indopak || undefined,
                textSimple: ayahRow.text_simple || undefined,
                pageNumber: ayahRow.page_number,
                juzNumber: ayahRow.juz_number,
                hizbNumber: ayahRow.hizb_number,
                rubNumber: ayahRow.rub_number,
                sajdah: ayahRow.sajdah_type !== null ? ayahRow.sajdah_type : null,
                textUthmani: ayahRow.text_uthmani || undefined,
                translation: translation?.translation || '',
                translationName: translation?.translation_name || '',
                audio: audioData,
                words,
            }
        })

        const surahData: SurahData = {
            surahNumber: surah.number,
            name: surah.name,
            englishName: surah.english_name,
            englishTranslation: surah.english_translation,
            arabicName: surah.arabic_name,
            revelationType: surah.revelation_type,
            totalAyahs: surah.total_ayahs,
            bismillahPre: surah.bismillah_pre === 1,
            ayahs,
        }

        return c.json({ success: true, data: surahData })
    } catch (error) {
        console.error('Error loading surah:', error)
        return c.json({ success: false, error: 'Failed to load surah' }, 500)
    }
})

export default surahRoutes
