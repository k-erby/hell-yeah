import { describe, expect, it } from 'vitest';
import { ideaUrl } from './ideas';

describe('ideaUrl', () => {
  it('fills in the idea form', () => {
    const url = new URL(ideaUrl('  Add a cat & a hamster\nThey could play with the dog  '));
    expect(url.origin + url.pathname).toBe('https://github.com/k-erby/hell-yeah/issues/new');
    expect(url.searchParams.get('template')).toBe('idea.yml');
    const body = url.searchParams.get('idea')!;
    expect(body).toContain('### What should the app do?\nAdd a cat & a hamster\nThey could play with the dog\n');
    expect(body).toContain('### Why do you want it to do that?');
    expect(body).toContain('### Anything else?');
    expect(url.searchParams.get('title')).toContain('Add a cat & a hamster');
    expect(url.searchParams.get('title')).not.toContain('They could');
  });

  it('shortens long titles', () => {
    const title = new URL(ideaUrl('x'.repeat(200))).searchParams.get('title')!;
    expect(title).toContain('…');
    expect(title.length).toBeLessThan(70);
  });
});
