import { describe, expect, it } from 'vitest';
import { ideaUrl } from './ideas';

describe('ideaUrl', () => {
  it('fills in the idea form', () => {
    const url = new URL(ideaUrl('  Add a cat & a hamster\nThey could play with the dog  '));
    expect(url.origin + url.pathname).toBe('https://github.com/k-erby/hell-yeah/issues/new');
    expect(url.searchParams.get('template')).toBe('idea.yml');
    expect(url.searchParams.get('idea')).toBe('Add a cat & a hamster\nThey could play with the dog');
    expect(url.searchParams.get('title')).toContain('Add a cat & a hamster');
    expect(url.searchParams.get('title')).not.toContain('They could');
  });

  it('shortens long titles', () => {
    const title = new URL(ideaUrl('x'.repeat(200))).searchParams.get('title')!;
    expect(title).toContain('…');
    expect(title.length).toBeLessThan(70);
  });
});
