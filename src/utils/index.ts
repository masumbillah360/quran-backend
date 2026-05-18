export const arabicDiacritics = /[\u064B-\u0652]/g;
export const alefVariants = /[\u0671\u0623\u0625\u0622]/g;

export function normalizeArabic(text: string): string {
    return text
        .normalize('NFC')
        .replace(arabicDiacritics, '')
        .replace(alefVariants, '\u0627')
        .replace(/^\s*سورة\s*/, '')
        .trim();
}
