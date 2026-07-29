/**
 * Voice selection for the browser demo.
 *
 * The Web Speech API exposes no "quality" or "neural" flag, so the only way
 * to avoid the flat robotic default is to rank voices by name. The markers
 * below are the ones vendors actually use:
 *
 *   - "Natural"  — Microsoft Edge neural voices (by far the best available)
 *   - "Neural"   — generic vendor marker
 *   - "Premium" / "Enhanced" — Apple's high-quality downloads
 *   - "Google"   — Chrome's cloud voices, better than the OS default
 *   - "Compact"  — Apple's *low* quality set, actively avoided
 *
 * Voices load asynchronously and are empty on first call in every browser,
 * hence `whenVoicesReady`.
 *
 * This is the demo only. The physical device does not synthesise speech at
 * all — see docs/hardware-and-approvals.md for why recorded clips are the
 * only workable approach for Namibia's languages.
 */

const PREFERRED = ['natural', 'neural', 'premium', 'enhanced', 'siri'];
const DEMOTED = ['compact', 'eloquence', 'espeak'];

export const whenVoicesReady = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    // Fires once the list populates; the timeout guards browsers that never
    // emit the event when no voices are installed at all.
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });

const score = (v: SpeechSynthesisVoice, langPrefix: string): number => {
  const name = v.name.toLowerCase();
  let s = 0;

  // Language match dominates: a great English voice reading Afrikaans is
  // worse than a plain Afrikaans one.
  if (v.lang.toLowerCase().startsWith(langPrefix)) s += 100;
  else if (v.lang.toLowerCase().startsWith(langPrefix.slice(0, 2))) s += 60;

  PREFERRED.forEach((m, i) => {
    if (name.includes(m)) s += 30 - i * 2;
  });
  if (name.includes('google')) s += 12;
  // Remote voices are usually the higher-quality cloud models.
  if (!v.localService) s += 8;
  DEMOTED.forEach((m) => {
    if (name.includes(m)) s -= 40;
  });
  return s;
};

/** Best available voice for a BCP-47 prefix such as "en-ZA" or "af". */
export const pickVoice = (
  voices: SpeechSynthesisVoice[],
  lang: string
): SpeechSynthesisVoice | undefined => {
  if (!voices.length) return undefined;
  const langPrefix = lang.toLowerCase();
  const ranked = [...voices].sort((a, b) => score(b, langPrefix) - score(a, langPrefix));
  const best = ranked[0];
  // If nothing even matched the language family, fall back to the default
  // voice rather than reading Oshiwambo in a French accent.
  return score(best, langPrefix) > 0 ? best : undefined;
};

export interface SpeakOptions {
  /** BCP-47 tag to request, e.g. "af-ZA". */
  lang?: string;
  voices?: SpeechSynthesisVoice[];
}

/**
 * Speak a line, choosing the best voice available.
 *
 * Rate is slightly under 1: a payment amount is a number someone acts on,
 * and the default rate clips digits in a way that costs comprehension
 * exactly where it matters most.
 */
export const speak = (text: string, { lang = 'en-ZA', voices = [] }: SpeakOptions = {}): void => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(voices, lang);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = lang;
    }
    utter.rate = 0.92;
    utter.pitch = 1;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  } catch {
    /* Speech is an enhancement; never let it break the demo. */
  }
};
