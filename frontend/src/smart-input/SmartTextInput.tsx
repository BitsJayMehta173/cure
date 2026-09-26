import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './SmartTextInput.css';
import { suggestApi } from './suggestApi';
import type { CompleteResult, SpellingIssue, SuggestContext, SuggestField, SuggestItem } from './suggestApi';

// Free-text fields complete the current word; the others suggest a value for the whole field.
const FREE_FIELDS: SuggestField[] = ['report_body', 'advice'];
const SPELLCHECK_FIELDS: SuggestField[] = ['report_body', 'advice', 'report_title', 'instructions'];
const COMPLETE_DEBOUNCE_MS = 70;
const CHECK_DEBOUNCE_MS = 650;

// Computed styles copied onto the mirror so its text lines up pixel-for-pixel with the field.
const MIRRORED_STYLES = [
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'letterSpacing', 'wordSpacing', 'lineHeight',
  'textTransform', 'textIndent', 'textAlign', 'tabSize', 'boxSizing',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
] as const;

interface SmartTextInputProps {
  field: SuggestField;
  value: string;
  onChange: (value: string) => void;
  doctorId?: number | null;
  /** textarea instead of a single-line input */
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  /** applied to the input/textarea (keep the page's existing look) */
  className?: string;
  style?: React.CSSProperties;
  /** applied to the wrapper — use for layout (flex: 1, width …) */
  wrapperStyle?: React.CSSProperties;
  required?: boolean;
  disabled?: boolean;
  /** e.g. the selected medicine, so dosage/frequency suggestions fit it */
  context?: SuggestContext;
  /** called when the doctor picks a dropdown item (e.g. a medicine) */
  onPick?: (item: SuggestItem) => void;
}

interface Suggestion extends CompleteResult {
  forValue: string;
}

/**
 * Drop-in replacement for the report / prescription / advice inputs:
 *  - grey ghost text (Tab or → accepts) for the next words or the rest of the word
 *  - dropdown of completions (↑/↓ + Tab/Enter, or click); medicines show their composition
 *  - red wavy underline on likely misspellings; click the word to fix, ignore, or add to your dictionary
 * If the suggestion service is unavailable it behaves exactly like a plain input.
 */
export const SmartTextInput: React.FC<SmartTextInputProps> = ({
  field, value, onChange, doctorId, multiline, rows, placeholder, className, style, wrapperStyle,
  required, disabled, context, onPick,
}) => {
  const free = FREE_FIELDS.includes(field);
  const spellcheck = SPELLCHECK_FIELDS.includes(field);
  const listId = useId();

  const fieldRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const caretMarkRef = useRef<HTMLSpanElement>(null);
  const issueRefs = useRef(new Map<number, HTMLSpanElement>());
  const completeTimer = useRef<number | undefined>(undefined);
  const checkTimer = useRef<number | undefined>(undefined);
  const completeAbort = useRef<AbortController | null>(null);
  const checkAbort = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const pendingCaret = useRef<number | null>(null);
  const suppressNext = useRef(false);        // don't reopen the list right after accepting

  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const [sugg, setSugg] = useState<Suggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [issues, setIssues] = useState<SpellingIssue[]>([]);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [fix, setFix] = useState<{ issue: SpellingIssue; top: number; left: number } | null>(null);
  const [listPos, setListPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [bg, setBg] = useState<string | null>(null);

  const contextKey = context?.medicine ?? '';

  // ─── mirror styling ──────────────────────────────────────────────────
  const syncMirror = useCallback(() => {
    const el = fieldRef.current;
    const mirror = mirrorRef.current;
    if (!el || !mirror) return;
    const cs = window.getComputedStyle(el);
    MIRRORED_STYLES.forEach(p => { (mirror.style as any)[p] = cs[p as any]; });
    // a textarea's scrollbar narrows its text area — mirror the lost width
    const borders = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const scrollbar = multiline ? Math.max(0, el.offsetWidth - el.clientWidth - borders) : 0;
    mirror.style.paddingRight = `${parseFloat(cs.paddingRight) + scrollbar}px`;
    mirror.style.width = `${el.offsetWidth}px`;
    mirror.style.height = `${el.offsetHeight}px`;
    if (!multiline) {
      // single-line inputs centre text vertically; match that with the line box
      const inner = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      mirror.style.lineHeight = `${inner}px`;
    }
    mirror.scrollTop = el.scrollTop;
    mirror.scrollLeft = el.scrollLeft;
  }, [multiline]);

  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    if (bg === null) {
      const c = window.getComputedStyle(el).backgroundColor;
      setBg(c && c !== 'rgba(0, 0, 0, 0)' ? c : '#fff');
    }
    syncMirror();
    const ro = new ResizeObserver(syncMirror);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncMirror, bg]);

  // keep the caret where we put it after programmatic edits
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      setCaret(pendingCaret.current);
      pendingCaret.current = null;
    }
    syncMirror();
  }, [value, syncMirror]);

  // ─── fetching ────────────────────────────────────────────────────────
  const requestComplete = useCallback(() => {
    const el = fieldRef.current;
    if (!el || disabled) return;
    const pos = el.selectionStart ?? value.length;
    const text = free ? value.slice(0, pos) : value;
    if (free && !text.trim()) { setSugg(null); setOpen(false); return; }
    const mySeq = ++seq.current;
    completeAbort.current?.abort();
    const ctrl = new AbortController();
    completeAbort.current = ctrl;
    suggestApi.complete(field, text, doctorId, context, ctrl.signal).then(res => {
      if (mySeq !== seq.current || !res) return;
      setSugg({ ...res, forValue: value });
      setActive(-1);
      // Free text stays calm: a confident ghost shows alone (↓ opens the list); the list appears
      // by itself only when the model is unsure. Whole-value fields always show their options.
      setOpen(res.items.length > 0 && !suppressNext.current && (!free || !res.ghost));
      suppressNext.current = false;
    });
  }, [field, free, value, doctorId, context, disabled]);

  useEffect(() => {
    if (!focused) return;
    window.clearTimeout(completeTimer.current);
    completeTimer.current = window.setTimeout(requestComplete, COMPLETE_DEBOUNCE_MS);
    return () => window.clearTimeout(completeTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, contextKey]);

  useEffect(() => {
    if (!spellcheck || disabled) return;
    window.clearTimeout(checkTimer.current);
    if (!value.trim()) { setIssues([]); return; }
    checkTimer.current = window.setTimeout(() => {
      checkAbort.current?.abort();
      const ctrl = new AbortController();
      checkAbort.current = ctrl;
      const pos = fieldRef.current && document.activeElement === fieldRef.current ? fieldRef.current.selectionStart : null;
      suggestApi.check(field, value, pos, doctorId, ignored, ctrl.signal).then(res => {
        if (res) setIssues(res.issues);
      });
    }, CHECK_DEBOUNCE_MS);
    return () => window.clearTimeout(checkTimer.current);
  }, [value, ignored, field, spellcheck, doctorId, disabled]);

  // ─── derived view state ──────────────────────────────────────────────
  const caretAtEnd = caret === value.length;
  const ghost = useMemo(() => {
    if (!focused || dismissed || !sugg?.ghost || !caretAtEnd || !value.startsWith(sugg.forValue)) return '';
    // keep the ghost while the doctor types the characters it predicted (no flicker)
    const typed = value.slice(sugg.forValue.length);
    if (!sugg.ghost.toLowerCase().startsWith(typed.toLowerCase())) return '';
    return sugg.ghost.slice(typed.length);
  }, [focused, dismissed, sugg, caretAtEnd, value]);

  const items = sugg && (sugg.forValue === value || !free) ? sugg.items : [];
  const listVisible = focused && open && !dismissed && items.length > 0;

  // issues still valid for the current text
  const liveIssues = useMemo(
    () => issues.filter(i => value.slice(i.start, i.end) === i.word && !ignored.includes(i.word.toLowerCase())),
    [issues, value, ignored]);

  // dropdown position: at the caret line for textareas, under the field for inputs
  useLayoutEffect(() => {
    if (!listVisible) return;
    const el = fieldRef.current;
    const mark = caretMarkRef.current;
    if (!el) return;
    if (multiline && mark && free) {
      const lh = parseFloat(window.getComputedStyle(el).lineHeight) || 20;
      const left = Math.min(mark.offsetLeft, Math.max(0, el.offsetWidth - 320));
      setListPos({ top: mark.offsetTop - el.scrollTop + lh + 2, left });
    } else {
      setListPos({ top: el.offsetHeight + 4, left: 0 });
    }
  }, [listVisible, caret, value, multiline, free]);

  // ─── editing actions ─────────────────────────────────────────────────
  const commit = (next: string, caretPos: number) => {
    pendingCaret.current = caretPos;
    suppressNext.current = true;
    onChange(next);
  };

  const acceptItem = (item: SuggestItem) => {
    if (!sugg) return;
    if (!free) {
      commit(item.text, item.text.length);
    } else {
      const pos = fieldRef.current?.selectionStart ?? value.length;
      const before = value.slice(0, pos);
      const after = value.slice(pos);
      const head = before.slice(0, before.length - sugg.replaceLength) + (sugg.prefix ?? '') + item.text;
      const glue = after.startsWith(' ') || after.startsWith('\n') ? '' : ' ';
      commit(head + glue + after, head.length + glue.length);
    }
    setOpen(false);
    setActive(-1);
    onPick?.(item);
  };

  const acceptGhost = () => {
    if (!ghost) return;
    const completed = value + ghost;
    // whole-value fields: insert the item exactly as listed ("augm" → "Augmentin 625 Duo Tablet")
    const top = !free ? items.find(it => it.text.toLowerCase() === completed.toLowerCase()) : undefined;
    if (top) {
      commit(top.text, top.text.length);
      onPick?.(top);
    } else {
      commit(completed, completed.length);
    }
    setOpen(false);
    setSugg(null);
  };

  const applyFix = (issue: SpellingIssue, replacement: string) => {
    commit(value.slice(0, issue.start) + replacement + value.slice(issue.end), issue.start + replacement.length);
    setFix(null);
  };

  const ignoreWord = (word: string, remember: boolean) => {
    setIgnored(prev => [...prev, word.toLowerCase()]);
    if (remember) suggestApi.addWord(word, doctorId);
    setFix(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (fix) { setFix(null); e.preventDefault(); return; }
      if (listVisible || ghost) { setDismissed(true); setOpen(false); e.preventDefault(); }
      return;
    }
    if (!listVisible && e.key === 'ArrowDown' && items.length > 0 && caretAtEnd) {
      e.preventDefault();
      setDismissed(false);
      setOpen(true);
      setActive(0);
      return;
    }
    if (listVisible && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const n = items.length;
      setActive(a => (e.key === 'ArrowDown' ? (a + 1) % n : (a <= 0 ? n - 1 : a - 1)));
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      if (listVisible && active >= 0) { e.preventDefault(); acceptItem(items[active]); return; }
      if (ghost) { e.preventDefault(); acceptGhost(); return; }
      if (listVisible && !free) { e.preventDefault(); acceptItem(items[0]); return; }
      return;
    }
    if (e.key === 'Enter' && listVisible && active >= 0) {
      e.preventDefault();
      acceptItem(items[active]);
      return;
    }
    if (e.key === 'ArrowRight' && ghost && caretAtEnd && fieldRef.current?.selectionEnd === value.length) {
      e.preventDefault();
      acceptGhost();
    }
  };

  const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDismissed(false);
    suppressNext.current = false;
    setFix(null);
    setCaret(e.target.selectionStart ?? e.target.value.length);
    onChange(e.target.value);
  };

  const onSelect = () => {
    const el = fieldRef.current;
    if (el) setCaret(el.selectionStart ?? 0);
  };

  // click on an underlined word → fix popover
  const onClickField = () => {
    const el = fieldRef.current;
    if (!el || el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart ?? 0;
    const issue = liveIssues.find(i => pos >= i.start && pos <= i.end);
    if (!issue) { setFix(null); return; }
    const span = issueRefs.current.get(issue.start);
    if (!span) return;
    setFix({
      issue,
      top: span.offsetTop - el.scrollTop + span.offsetHeight + 4,
      left: Math.min(span.offsetLeft - el.scrollLeft, Math.max(0, el.offsetWidth - 240)),
    });
  };

  // ─── mirror content: text + underlines + caret marker + ghost ──────────
  const mirrorContent = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    const marks = [...liveIssues].sort((a, b) => a.start - b.start);
    let pos = 0;
    const pushText = (to: number) => {
      if (to <= pos) return;
      if (caret > pos && caret <= to && caret !== value.length) {
        nodes.push(value.slice(pos, caret), <span key="caret" ref={caretMarkRef} />, value.slice(caret, to));
      } else {
        nodes.push(value.slice(pos, to));
      }
      pos = to;
    };
    issueRefs.current.clear();
    for (const m of marks) {
      if (m.start < pos) continue;
      pushText(m.start);
      nodes.push(
        <span key={`i${m.start}`} className="sti-misspelt" ref={node => { if (node) issueRefs.current.set(m.start, node); }}>
          {value.slice(m.start, m.end)}
        </span>);
      pos = m.end;
    }
    pushText(value.length);
    if (caret === value.length) nodes.push(<span key="caret" ref={caretMarkRef} />);
    if (ghost) nodes.push(<span key="ghost" className="sti-ghost">{ghost}</span>);
    if (value.endsWith('\n') || !value) nodes.push('​');
    return nodes;
  }, [liveIssues, value, caret, ghost]);

  const FieldTag: any = multiline ? 'textarea' : 'input';

  return (
    <div className="sti-wrap" style={wrapperStyle}>
      <div ref={mirrorRef} className={`sti-mirror ${multiline ? 'multiline' : 'single'}`} aria-hidden="true"
        style={{ background: bg ?? undefined }}>
        {mirrorContent}
      </div>
      <FieldTag
        ref={fieldRef}
        className={`${className ?? ''} sti-field`}
        style={{ ...style, background: 'transparent' }}
        value={value}
        rows={multiline ? rows : undefined}
        type={multiline ? undefined : 'text'}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="both"
        aria-expanded={listVisible}
        aria-controls={listId}
        aria-activedescendant={listVisible && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={onFieldChange}
        onKeyDown={onKeyDown}
        onSelect={onSelect}
        onClick={onClickField}
        onScroll={syncMirror}
        onFocus={() => { setFocused(true); setDismissed(false); }}
        onBlur={() => { setFocused(false); setOpen(false); setFix(null); }}
      />

      {listVisible && (
        <ul className="sti-list" id={listId} role="listbox" style={{ top: listPos.top, left: listPos.left }}>
          {items.map((it, i) => (
            <li
              key={`${it.text}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`sti-item ${i === active ? 'active' : ''} ${it.kind}`}
              onMouseDown={e => { e.preventDefault(); acceptItem(it); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="sti-item-text">
                {it.fuzzy && <span className="sti-badge fuzzy">Did you mean</span>}
                {it.text}
                {it.discontinued && <span className="sti-badge off">discontinued</span>}
              </span>
              {it.detail && <span className="sti-item-detail">{it.detail}</span>}
            </li>
          ))}
          <li className="sti-hint" aria-hidden="true">
            <kbd>Tab</kbd> accept · <kbd>↑</kbd><kbd>↓</kbd> choose · <kbd>Esc</kbd> close
          </li>
        </ul>
      )}

      {fix && (
        <div className="sti-fix" style={{ top: fix.top, left: fix.left }} onMouseDown={e => e.preventDefault()}>
          <div className="sti-fix-title">Did you mean</div>
          <div className="sti-fix-options">
            {fix.issue.suggestions.map(s => (
              <button key={s} type="button" className="sti-fix-btn" onClick={() => applyFix(fix.issue, s)}>{s}</button>
            ))}
          </div>
          <div className="sti-fix-actions">
            <button type="button" onClick={() => ignoreWord(fix.issue.word, false)}>Ignore</button>
            <button type="button" onClick={() => ignoreWord(fix.issue.word, true)}>Add “{fix.issue.word}” to my words</button>
          </div>
        </div>
      )}
    </div>
  );
};
