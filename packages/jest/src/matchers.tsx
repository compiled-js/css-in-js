import CSS from 'css';
import { MatchFilter } from './types';

type Arg = [{ [key: string]: string }, MatchFilter?];

const DEFAULT_MATCH_FILTER: MatchFilter = { media: undefined, target: undefined };

const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

const mapProperties = (properties: Record<string, any>) =>
  Object.keys(properties).map(property => `${kebabCase(property)}:${properties[property]}`);

const getMountedProperties = () =>
  Array.from(document.styleSheets)
    .map(sheet =>
      // @ts-ignore
      sheet.cssRules.map((rule: CSSRule) => rule.style.cssText)
    )
    .join(' ');

const getRules = (ast: CSS.Stylesheet, filter: MatchFilter, className: string) => {
  const { media, target } = filter;

  // rules are present directly inside ast.stylesheet.rules
  // but if a media query is present it is nested inside ast.stylesheet.media.rules
  // this inner function returns the relevant rules
  const getAllRules = () => {
    if (media) {
      const mediaRules = ast.stylesheet?.rules.filter(r => {
        if ('media' in r) {
          return r.media === media;
        }
        return;
      });

      return mediaRules?.reduce<CSS.Rule[]>((acc, m) => {
        if ('rules' in m && m.rules) {
          acc = [...acc, ...m.rules];
        }
        return acc;
      }, []);
    }
    return ast.stylesheet?.rules.filter(r => (r.type = 'rule')); // omit media objects
  };

  const allRules = getAllRules();
  const klass = target ? `.${className}${target}` : `.${className}`;
  return allRules?.filter(r => {
    if ('selectors' in r) {
      return r.selectors?.find(s => s === klass);
    }
    return;
  });
};

const findStylesInRules = (styles: string[], rules: CSS.Rule[] | undefined) => {
  const found: string[] = [];

  if (!rules) return found;

  styles.forEach(s => {
    rules?.forEach(r => {
      if ('declarations' in r) {
        r.declarations?.forEach(d => {
          if ('property' in d) {
            if (s === `${d.property}:${d.value}`) found.push(s);
          }
        });
      }
    });
  });
  return found;
};

export function toHaveCompiledCss(
  this: jest.MatcherUtils,
  element: HTMLElement,
  ...args: [Arg | string, string, MatchFilter?]
): jest.CustomMatcherResult {
  const [property, value, matchFilter = DEFAULT_MATCH_FILTER] = args;
  const properties = typeof property === 'string' ? { [property]: value } : property;
  const inlineStyleTag = element.parentElement && element.parentElement.querySelector('style');
  const styleElements: HTMLStyleElement[] =
    inlineStyleTag != null ? [inlineStyleTag] : Array.from(document.head.querySelectorAll('style'));

  if (!styleElements) {
    return {
      pass: false,
      message: () => 'pairing style element was not found',
    };
  }

  const stylesToFind = mapProperties(properties);
  const foundStyles: string[] = [];
  const classNames = element.className.split(' ');

  for (const styleElement of styleElements) {
    let css = styleElement.textContent || '';
    // This is a hack to get ahold of the styles.
    // Unfortunately JSDOM doesn't handle css variables properly
    // See: https://github.com/jsdom/jsdom/issues/1895
    // @ts-ignore
    const styles = element[Object.keys(element)[0]].memoizedProps.style;

    if (styles && Object.keys(styles).length > 0) {
      Object.entries(styles).forEach(([key, value]: [string, any]) => {
        // Replace all instances of var with the value.
        // We split and join to replace all instances without needing to jump into a dynamic regex.
        css = css.split(`var(${key})`).join(value);
      });
    }

    const ast = CSS.parse(css);
    classNames.forEach(c => {
      const rules = getRules(ast, matchFilter, c);
      foundStyles.push(...findStylesInRules(stylesToFind, rules));
    });
  }

  const notFoundStyles = stylesToFind.filter(style => !foundStyles.includes(style));
  const foundFormatted = stylesToFind.join(', ');
  const notFoundFormatted = notFoundStyles.join(', ');

  if (foundStyles.length > 0 && notFoundStyles.length === 0) {
    return {
      pass: true,
      message: !this.isNot
        ? () => ''
        : () =>
            `Found "${foundFormatted}" on <${element.nodeName.toLowerCase()} css={\`${getMountedProperties()}\`}> element.`,
    };
  }

  return {
    pass: false,
    message: () =>
      `Could not find "${notFoundFormatted}" on <${element.nodeName.toLowerCase()} css={\`${getMountedProperties()}\`}> element.`,
  };
}
