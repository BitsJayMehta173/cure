// Client for the ML service's clinical autocomplete (/api/suggest/* in backend-ml).
// Never throws: when the service is down it backs off for 30s and every call returns null,
// so SmartTextInput silently behaves like a plain input.

// 127.0.0.1 (not "localhost"): on Windows "localhost" tries IPv6 first and adds ~200ms per call.
const ML = import.meta.env.VITE_ML_URL || 'http://127.0.0.1:5000';

export type SuggestField =
  | 'report_title' | 'report_body' | 'advice'
  | 'medicine' | 'dosage' | 'frequency' | 'duration' | 'instructions';

export interface SuggestItem {
  text: string;
  detail?: string;          // composition for medicines, label for phrases ("twice daily")
  kind: 'word' | 'next' | 'phrase' | 'brand' | 'generic';
  fuzzy?: boolean;          // typo match — shown as "Did you mean?"
  discontinued?: boolean;
  form?: string;
}

export interface CompleteResult {
  ghost: string | null;     // inline grey continuation, appended at the caret
  items: SuggestItem[];     // dropdown choices
  replaceLength: number;    // chars before the caret an item replaces (partial word, or whole field)
  prefix?: string;          // text to insert before a next-word item (e.g. a space)
}

export interface SpellingIssue {
  start: number;
  end: number;
  word: string;
  suggestions: string[];
}

export interface SuggestContext {
  medicine?: string;        // selected medicine, so dosage/frequency suggestions fit it
}

let downUntil = 0;

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T | null> {
  if (Date.now() < downUntil) return null;
  try {
    const res = await fetch(`${ML}/api/suggest${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      if (res.status >= 500) downUntil = Date.now() + 30_000;
      return null;
    }
    return res.status === 204 ? null : ((await res.json()) as T);
  } catch (e: any) {
    if (e?.name !== 'AbortError') downUntil = Date.now() + 30_000;
    return null;
  }
}

export const suggestApi = {
  complete: (field: SuggestField, text: string, doctorId?: number | null, context?: SuggestContext, signal?: AbortSignal) =>
    post<CompleteResult>('/complete', { field, text, doctorId: doctorId ?? null, context: context ?? {} }, signal),

  check: (field: SuggestField, text: string, caret: number | null, doctorId?: number | null, ignore: string[] = [], signal?: AbortSignal) =>
    post<{ issues: SpellingIssue[] }>('/check', { field, text, caret, doctorId: doctorId ?? null, ignore }, signal),

  /** Teach the doctor's personal model (call after a record is saved). Fire-and-forget. */
  learn: (field: SuggestField, text: string, doctorId?: number | null, context?: SuggestContext) => {
    if (!doctorId || !text?.trim()) return;
    void post('/learn', { field, text, doctorId, context: context ?? {} });
  },

  addWord: (word: string, doctorId?: number | null) => {
    if (!doctorId || !word.trim()) return;
    void post('/dictionary', { word, doctorId });
  },
};
