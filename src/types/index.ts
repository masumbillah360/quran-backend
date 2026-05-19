export interface SurahMeta {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: 'Meccan' | 'Medinan';
}

export type Surah = SurahMeta;

export interface AudioSegment {
    wordIndex: number;
    startTime: number;
    endTime: number;
}

export interface WordData {
    id?: string;
    position: number;
    text: string;
    textIndopak?: string;
    translation: string;
    transliteration: string;
    charType: 'word' | 'end';
    audioSegment?: AudioSegment;
}

export interface AyahAudio {
    url: string;
    duration: number;
    segments?: [string, string, string][];
}

export interface AyahData {
    id?: string;
    ayahNumber: number;
    verseKey: string;
    textIndopak?: string;
    textSimple?: string;
    pageNumber: number;
    juzNumber: number;
    hizbNumber: number;
    rubNumber: number;
    sajdah: boolean | null;
    textUthmani?: string;
    translation: string;
    translationName: string;
    audio: AyahAudio;
    words: WordData[];
}

export interface SurahData {
    surahNumber: number;
    name: string;
    englishName: string;
    englishTranslation: string;
    arabicName: string;
    revelationType: 'Meccan' | 'Medinan';
    totalAyahs: number;
    bismillahPre: boolean;
    ayahs: AyahData[];
}

export interface CachedSurah {
    data: SurahData;
    loadedAt: number;
}

export interface SearchResult {
    type: 'surah' | 'ayah';
    surahNumber: number;
    surahEnglishName: string;
    surahArabicName: string;
    ayahNumber?: number;
    verseKey?: string;
    arabicText?: string;
    translation?: string;
    matchType: 'name' | 'translation' | 'arabic' | 'english';
}

/** Convert Western numerals to Arabic/Eastern numerals */
export function toArabicNumerals(n: number): string {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(n)
        .split('')
        .map((d) => arabicDigits[parseInt(d)] || d)
        .join('');
}

/** Parse raw segment array into typed AudioSegment */
export function parseAudioSegments(
    segments: [string, string, string][] | undefined,
): Map<number, AudioSegment> {
    const map = new Map<number, AudioSegment>();
    if (!segments) return map;

    for (const [wordIdx, startMs, endMs] of segments) {
        const wordIndex = parseInt(wordIdx);
        map.set(wordIndex, {
            wordIndex,
            startTime: parseInt(startMs),
            endTime: parseInt(endMs),
        });
    }
    return map;
}

/** Get estimated height for an ayah card (for virtualization) */
export function estimateAyahHeight(
    ayah: AyahData,
    arabicFontSize: number,
): number {
    const wordCount = ayah.words.filter((w) => w.charType === 'word').length;
    const translationLength = ayah.translation.length;

    const headerHeight = 40;
    const arabicLineHeight = arabicFontSize * 2.8;
    const translationLineHeight = 24;
    const padding = 40;

    const arabicLines = Math.ceil(wordCount / 8);
    const translationLines = Math.ceil(translationLength / 80);

    return (
        headerHeight +
        arabicLines * arabicLineHeight +
        translationLines * translationLineHeight +
        padding
    );
}
