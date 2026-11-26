import { tx } from './i18n';

/** Where "Drop an idea" files its issues. */
export const IDEAS_REPO = 'k-erby/hell-yeah';

/**
 * Link to GitHub's new-issue page with the idea filled in
 * (uses .github/ISSUE_TEMPLATE/idea.yml; `idea` is that form's field id).
 * No token needed: the person taps Create on GitHub, signed in as themselves.
 */
export function ideaUrl(idea: string): string {
  const text = idea.trim();
  const firstLine = text.split('\n')[0].trim();
  const short = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
  const q = new URLSearchParams({ template: 'idea.yml', title: tx('settings.ideas.issueTitle', { idea: short }), idea: text });
  return `https://github.com/${IDEAS_REPO}/issues/new?${q}`;
}
