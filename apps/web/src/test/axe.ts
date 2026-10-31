import axe from 'axe-core';

/** WCAG 2.2 A/AA rules. `color-contrast` is skipped: jsdom does not compute styles. */
const OPTIONS: axe.RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

/**
 * Runs axe against a rendered element.
 * @param element - The rendered element to check.
 * @returns One readable line per violation, so `toEqual([])` failures name the rule and nodes.
 */
export async function axeViolations(element: Element): Promise<string[]> {
  const { violations } = await axe.run(element, OPTIONS);
  return violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
}
