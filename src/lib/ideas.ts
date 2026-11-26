import { tx } from './i18n';

/** Where "Drop an idea" files its issues. */
export const IDEAS_REPO = 'k-erby/hell-yeah';

/**
 * Link to GitHub's new-issue page with the idea filled in
 * under the first heading (uses .github/ISSUE_TEMPLATE/idea.yml; `idea` is that
 * form's one field, and filling it replaces the form's headings, so we send them too).
 * No token needed: the person taps Create on GitHub, signed in as themselves.
 */
export function ideaUrl(idea: string): string {
  const text = idea.trim();
  const firstLine = text.split('\n')[0].trim();
  const short = firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine;
  const q = new URLSearchParams({ template: 'idea.yml', title: tx('settings.ideas.issueTitle', { idea: short }), idea: tx('settings.ideas.issueBody', { idea: text }) });
  return `https://github.com/${IDEAS_REPO}/issues/new?${q}`;
}
