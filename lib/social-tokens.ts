export type TextSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; username: string }
  | { type: 'hashtag'; text: string; tag: string };

export interface ActiveToken {
  trigger: '@' | '#';
  query: string;
  start: number;
  end: number;
}

const TOKEN_PATTERN =
  /(?<![a-zA-Z0-9_.@])@[a-zA-Z][a-zA-Z0-9_.]{1,29}|(?<![a-zA-Z0-9_])#[a-zA-Z0-9_]{1,50}/g;

/**
 * Splits plain text into literal text, `@mention`, and `#hashtag` segments
 * without altering punctuation or whitespace.
 */
export function tokenizeSocialText(text: string): TextSegment[] {
  if (!text) return [];
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(TOKEN_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    if (raw.startsWith('@')) {
      const cleaned = raw.slice(1).replace(/\.+$/, '');
      if (cleaned.length < 2) {
        continue;
      }
      if (start > lastIndex) {
        segments.push({ type: 'text', text: text.slice(lastIndex, start) });
      }
      const tokenText = `@${cleaned}`;
      segments.push({
        type: 'mention',
        text: tokenText,
        username: cleaned.toLowerCase(),
      });
      const consumedEnd = start + tokenText.length;
      lastIndex = consumedEnd;
      regex.lastIndex = consumedEnd;
      continue;
    }

    if (raw.startsWith('#')) {
      const cleaned = raw.slice(1);
      if (cleaned.length < 1) continue;
      if (start > lastIndex) {
        segments.push({ type: 'text', text: text.slice(lastIndex, start) });
      }
      segments.push({
        type: 'hashtag',
        text: raw,
        tag: cleaned.toLowerCase(),
      });
      lastIndex = start + raw.length;
    }
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Inspects text before `cursorPos` and returns an active `@mention` or `#hashtag` token if being typed.
 */
export function detectActiveToken(value: string, cursorPos: number): ActiveToken | null {
  const clamped = Math.max(0, Math.min(cursorPos, value.length));
  const beforeCursor = value.slice(0, clamped);
  let i = beforeCursor.length - 1;

  while (i >= 0 && !/\s/.test(beforeCursor[i])) {
    i--;
  }
  const start = i + 1;
  const word = beforeCursor.slice(start);
  if (word.length < 1) return null;

  const trigger = word[0];
  if (trigger === '@') {
    const query = word.slice(1);
    if (query.length > 0 && !/^[a-zA-Z0-9_.]+$/.test(query)) return null;
    return { trigger: '@', query, start, end: clamped };
  }

  if (trigger === '#') {
    const query = word.slice(1);
    if (query.length > 0 && !/^[a-zA-Z0-9_]+$/.test(query)) return null;
    return { trigger: '#', query, start, end: clamped };
  }

  return null;
}

/**
 * Replaces the active `@...` or `#...` span with the chosen handle/tag + trailing space.
 */
export function applyTokenSelection(
  value: string,
  token: ActiveToken,
  selectedValue: string
): { nextValue: string; nextCursor: number } {
  const clean = selectedValue.replace(/^[@#]/, '');
  const prefix = value.slice(0, token.start);
  const suffix = value.slice(token.end);
  const inserted = `${token.trigger}${clean}${suffix.startsWith(' ') ? '' : ' '}`;
  const nextValue = `${prefix}${inserted}${suffix}`;
  return {
    nextValue,
    nextCursor: prefix.length + inserted.length,
  };
}
