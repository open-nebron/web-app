import { describe, it, expect } from 'vitest';
import { applyTokenSelection, detectActiveToken, tokenizeSocialText } from './social-tokens';

describe('V4-2 social text tokens & autocomplete helpers', () => {
  it('tokenizes @mentions and #hashtags while preserving punctuation and ignoring emails', () => {
    const segments = tokenizeSocialText(
      'Hey @Alice.V42, contact ops@nebron.io or @bob_1! #Nebron2026 #Dev.'
    );
    expect(segments).toEqual([
      { type: 'text', text: 'Hey ' },
      { type: 'mention', text: '@Alice.V42', username: 'alice.v42' },
      { type: 'text', text: ', contact ops@nebron.io or ' },
      { type: 'mention', text: '@bob_1', username: 'bob_1' },
      { type: 'text', text: '! ' },
      { type: 'hashtag', text: '#Nebron2026', tag: 'nebron2026' },
      { type: 'text', text: ' ' },
      { type: 'hashtag', text: '#Dev', tag: 'dev' },
      { type: 'text', text: '.' },
    ]);
  });

  it('detects active @ and # tokens cleanly at cursor position', () => {
    expect(detectActiveToken('Hello @ali', 10)).toEqual({
      trigger: '@',
      query: 'ali',
      start: 6,
      end: 10,
    });
    expect(detectActiveToken('@', 1)).toEqual({
      trigger: '@',
      query: '',
      start: 0,
      end: 1,
    });
    expect(detectActiveToken('Look #neb', 9)).toEqual({
      trigger: '#',
      query: 'neb',
      start: 5,
      end: 9,
    });
    expect(detectActiveToken('Hello @ali ', 11)).toBeNull();
  });

  it('applies autocomplete selection and computes next cursor position', () => {
    const token = detectActiveToken('Shoutout @al tomorrow', 12)!;
    const res = applyTokenSelection('Shoutout @al tomorrow', token, 'alice_c');
    expect(res).toEqual({
      nextValue: 'Shoutout @alice_c tomorrow',
      nextCursor: 17,
    });
  });
});
