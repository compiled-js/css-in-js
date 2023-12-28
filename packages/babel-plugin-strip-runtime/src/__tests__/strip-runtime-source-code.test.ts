import type { BabelFileMetadata } from '../types';

import { transform, transformSync } from './transform';

// Mock out FS to avoid writing to disk
// We aren't processing the result anyway, so no need for specifying the response
jest.mock('fs');

const testStyleSheetPath =
  '@compiled/webpack-loader/css-loader!@compiled/webpack-loader/css-loader/compiled-css.css';
const regexToFindRequireStatements =
  /(require\('@compiled\/webpack-loader\/css-loader!@compiled\/webpack-loader\/css-loader\/compiled-css\.css\?style=.*;)/g;
const testSSR = true;

// This test suite is designed to test source code, which is also known as first-party code
describe('babel-plugin-strip-runtime using source code', () => {
  const code = `
    import '@compiled/react';

    const Component = () => (
      <div css={{ fontSize: 12, color: 'blue' }}>
        hello world
      </div>
    );
  `;

  describe('when run in the same step', () => {
    describe('with the automatic runtime', () => {
      const runtime = 'automatic';

      it('removes the css prop runtime', () => {
        const actual = transform(code, { run: 'both', runtime });

        expect(actual).toMatchInlineSnapshot(`
          "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
          import { ax, ix } from '@compiled/react/runtime';
          import { jsxs as _jsxs } from 'react/jsx-runtime';
          import { jsx as _jsx } from 'react/jsx-runtime';
          const Component = () =>
            /*#__PURE__*/ _jsx('div', {
              className: ax(['_1wyb1fwx _syaz13q2']),
              children: 'hello world',
            });
          "
        `);
      });

      it('adds require statement for every found style', () => {
        const actual = transform(code, {
          styleSheetPath: testStyleSheetPath,
          run: 'both',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual([
          `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
          `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
        ]);
      });

      it('does not add require statement in a node environment', () => {
        const actual = transform(code, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'both',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual(null);
      });

      it('adds styleRules to metadata in a node environment', () => {
        const actual = transformSync(code, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'both',
          runtime,
        });

        const metadata = actual?.metadata as BabelFileMetadata;

        expect(metadata).toEqual({
          styleRules: ['._1wyb1fwx{font-size:12px}', '._syaz13q2{color:blue}'],
        });
      });
    });

    describe('with the classic runtime', () => {
      const runtime = 'classic';

      it('removes the css prop runtime', () => {
        const actual = transform(code, { run: 'both', runtime });

        expect(actual).toMatchInlineSnapshot(`
          "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
          import * as React from 'react';
          import { ax, ix } from '@compiled/react/runtime';
          const Component = () =>
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: ax(['_1wyb1fwx _syaz13q2']),
              },
              'hello world'
            );
          "
        `);
      });

      it('adds require statement for every found style', () => {
        const actual = transform(code, {
          styleSheetPath: testStyleSheetPath,
          run: 'both',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual([
          `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
          `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
        ]);
      });

      it('does not add require statement in a node environment', () => {
        const actual = transform(code, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'both',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual(null);
      });

      it('adds styleRules to metadata in a node environment', () => {
        const actual = transformSync(code, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'both',
          runtime,
        });

        const metadata = actual?.metadata as BabelFileMetadata;

        expect(metadata).toEqual({
          styleRules: ['._1wyb1fwx{font-size:12px}', '._syaz13q2{color:blue}'],
        });
      });
    });
  });

  describe('when run in subsequent steps', () => {
    describe('with the automatic runtime', () => {
      const runtime = 'automatic';

      it('removes the css prop runtime', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, { run: 'extract', runtime });

        expect(actual).toMatchInlineSnapshot(`
          "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
          import { ax, ix } from '@compiled/react/runtime';
          import { jsxs as _jsxs } from 'react/jsx-runtime';
          import { jsx as _jsx } from 'react/jsx-runtime';
          const Component = () =>
            /*#__PURE__*/ _jsx('div', {
              className: ax(['_1wyb1fwx _syaz13q2']),
              children: 'hello world',
            });
          "
        `);
      });

      it('adds require statement for every found style', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, {
          styleSheetPath: testStyleSheetPath,
          run: 'extract',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual([
          `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
          `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
        ]);
      });

      it('does not add require statement in a node environment', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'extract',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual(null);
      });

      it('adds styleRules to metadata in a node environment', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transformSync(baked, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'extract',
          runtime,
        });

        const metadata = actual?.metadata as BabelFileMetadata;

        expect(metadata).toEqual({
          styleRules: ['._1wyb1fwx{font-size:12px}', '._syaz13q2{color:blue}'],
        });
      });
    });

    describe('with the classic runtime', () => {
      const runtime = 'classic';

      it('remove the css prop runtime', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, { run: 'extract', runtime });

        expect(actual).toMatchInlineSnapshot(`
          "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
          import * as React from 'react';
          import { ax, ix } from '@compiled/react/runtime';
          const Component = () =>
            /*#__PURE__*/ React.createElement(
              'div',
              {
                className: ax(['_1wyb1fwx _syaz13q2']),
              },
              'hello world'
            );
          "
        `);
      });

      it('adds require statement for every found style', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, {
          styleSheetPath: testStyleSheetPath,
          run: 'extract',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual([
          `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
          `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
        ]);
      });

      it('does not add require statement in a node environment', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transform(baked, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'extract',
          runtime,
        });

        expect(actual.match(regexToFindRequireStatements)).toEqual(null);
      });

      it('adds styleRules to metadata in a node environment', () => {
        const baked = transform(code, { run: 'bake', runtime });
        const actual = transformSync(baked, {
          styleSheetPath: testStyleSheetPath,
          compiledRequireExclude: testSSR,
          run: 'extract',
          runtime,
        });

        const metadata = actual?.metadata as BabelFileMetadata;

        expect(metadata).toEqual({
          styleRules: ['._1wyb1fwx{font-size:12px}', '._syaz13q2{color:blue}'],
        });
      });
    });
  });
});
