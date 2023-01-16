import { join } from 'path';

import { transformSync } from '@babel/core';
import compiledBabelPlugin from '@compiled/babel-plugin';
import { format } from 'prettier';

import stripRuntimeBabelPlugin from '../index';

const testStyleSheetPath =
  '@compiled/webpack-loader/css-loader!@compiled/webpack-loader/css-loader/compiled-css.css';
const regexToFindRequireStatements =
  /(require\('@compiled\/webpack-loader\/css-loader!@compiled\/webpack-loader\/css-loader\/compiled-css\.css\?style=.*;)/g;
const testSSR = true;

const transform = (
  code: string,
  opts: {
    modules?: boolean;
    styleSheetPath?: string;
    compiledRequireExclude?: boolean;
    runtime: 'automatic' | 'classic';
  }
): string => {
  const { modules, styleSheetPath, compiledRequireExclude, runtime } = opts;
  const filename = join(__dirname, 'app.tsx');

  const initialFileResult = transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [[compiledBabelPlugin, { optimizeCss: false }]],
    presets: [
      ['@babel/preset-env', { targets: { esmodules: true }, modules: modules ?? 'auto' }],
      '@babel/preset-typescript',
      ['@babel/preset-react', { runtime, useBuiltIns: true }],
    ],
  });

  if (!initialFileResult || !initialFileResult.code) {
    throw new Error(`Missing initial fileResult: ${initialFileResult}`);
  }

  const fileResult = transformSync(initialFileResult.code, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [[stripRuntimeBabelPlugin, { styleSheetPath, compiledRequireExclude }]],
  });

  if (!fileResult || !fileResult.code) {
    throw new Error(`Missing fileResult: ${fileResult}`);
  }

  return format(fileResult.code, {
    parser: 'babel',
    singleQuote: true,
  });
};

// This test suite is designed to test transpiled code, which is often found in third-party node_modules dependencies
describe('babel-plugin-strip-runtime using transpiled code', () => {
  const code = `
    import '@compiled/react';

    const Component = () => (
      <div css={{ fontSize: 12, color: 'blue' }}>
        hello world
      </div>
    );
  `;

  describe('with the automatic runtime', () => {
    const runtime = 'automatic';

    it('adds require statement for every found style', () => {
      const actual = transform(code, { styleSheetPath: testStyleSheetPath, runtime });

      expect(actual.match(regexToFindRequireStatements)).toEqual([
        `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
        `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
      ]);
    });

    it('does not add require statement in a node environment', () => {
      const actual = transform(code, {
        styleSheetPath: testStyleSheetPath,
        compiledRequireExclude: testSSR,
        runtime,
      });

      expect(actual.match(regexToFindRequireStatements)).toEqual(null);
    });

    it('strips the css prop runtime when using transformed modules', () => {
      const actual = transform(code, { runtime: 'automatic' });

      expect(actual.split('var Component = ')[1]).toMatchInlineSnapshot(`
        "() =>
          (0, _jsxRuntime.jsx)('div', {
            className: '_1wyb1fwx _syaz13q2',
            children: 'hello world',
          });
        "
      `);
    });

    it('strips the css prop runtime when using untransformed modules', () => {
      const actual = transform(code, { modules: false, runtime });

      expect(actual).toMatchInlineSnapshot(`
        "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
        import * as React from 'react';
        import { ax, ix } from '@compiled/react/runtime';
        import { jsxs as _jsxs } from 'react/jsx-runtime';
        import { jsx as _jsx } from 'react/jsx-runtime';

        var Component = () =>
          _jsx('div', {
            className: '_1wyb1fwx _syaz13q2',
            children: 'hello world',
          });
        "
      `);
    });
  });

  describe('with the classic runtime', () => {
    const runtime = 'classic';

    it('adds require statement for every found style', () => {
      const actual = transform(code, { styleSheetPath: testStyleSheetPath, runtime });

      expect(actual.match(regexToFindRequireStatements)).toEqual([
        `require('${testStyleSheetPath}?style=._syaz13q2%7Bcolor%3Ablue%7D');`,
        `require('${testStyleSheetPath}?style=._1wyb1fwx%7Bfont-size%3A12px%7D');`,
      ]);
    });

    it('does not add require statement in a node environment', () => {
      const actual = transform(code, {
        styleSheetPath: testStyleSheetPath,
        compiledRequireExclude: testSSR,
        runtime,
      });

      expect(actual.match(regexToFindRequireStatements)).toEqual(null);
    });

    it('strips the css prop runtime when using transformed modules', () => {
      const actual = transform(code, { runtime });

      expect(actual.split('var Component = ')[1]).toMatchInlineSnapshot(`
        "() =>
          React.createElement(
            'div',
            {
              className: '_1wyb1fwx _syaz13q2',
            },
            'hello world'
          );
        "
      `);
    });

    it('strips the css prop runtime when using untransformed modules', () => {
      const actual = transform(code, { modules: false, runtime });

      expect(actual).toMatchInlineSnapshot(`
        "/* app.tsx generated by @compiled/babel-plugin v0.0.0 */
        import * as React from 'react';
        import { ax, ix } from '@compiled/react/runtime';

        var Component = () =>
          React.createElement(
            'div',
            {
              className: '_1wyb1fwx _syaz13q2',
            },
            'hello world'
          );
        "
      `);
    });
  });
});
