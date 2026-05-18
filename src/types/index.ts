export type Surah = {
    number: number;
    name: string;
    englishName: string;
    englishTranslation: string;
    arabicName: string;
    revelationType: string;
    totalAyahs: number;
    bismillahPre: boolean;
};

export type AyahAudio = {
    id: number;
    audio_url: string;
    duration: number;
    reciter: string;
    segments?: { word_index: number; start_time: number; end_time: number }[];
};

export type Word = {
    id: number;
    position: number;
    text: string;
    translation?: string;
    transliteration?: string;
    audioSegment?: { wordIndex: number; startTime: number; endTime: number };
};

export type AyahDetail = {
    id: number;
    ayahNumber: number;
    verseKey: string;
    textUthmani: string;
    textIndopak: string;
    textSimple: string;
    pageNumber: number;
    juzNumber: number;
    hizbNumber: number;
    rubNumber: number;
    sajdahType: string | null;
    translation?: { translation: string; translation_name: string };
    audio?: AyahAudio;
    words?: Word[];
};

export type SurahAudio = {
    ayahId: number;
    audioUrl: string;
    duration: number;
    reciter: string;
}[];

export type SurahDetailResponse = {
    meta: Omit<Surah, 'bismillahPre'> & { bismillahPre: boolean };
    ayahs: AyahDetail[];
    audio: SurahAudio;
};

export type SearchResultItem = {
    verseKey: string;
    textUthmani: string;
    translation: string;
    surahEnglishName: string;
    surahNumber: number;
};
