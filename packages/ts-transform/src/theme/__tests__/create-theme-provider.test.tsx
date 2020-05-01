import * as ts from 'typescript';
import transformer from '../index';
import { TransformerOptions, Tokens } from '../../types';

const stubProgram: ts.Program = ({
  getTypeChecker: () => ({
    getSymbolAtLocation: () => undefined,
  }),
} as never) as ts.Program;

const transpileModule = (source: string, opts: TransformerOptions = {}) => {
  return ts.transpileModule(source, {
    transformers: { before: [transformer(stubProgram, opts)] },
    compilerOptions: {
      module: ts.ModuleKind.ES2015,
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
    },
  }).outputText;
};

describe('create theme provider', () => {
  const tokens: Tokens = {
    base: {},
    default: {},
  };

  it('should remove theme import', () => {
    const actual = transpileModule(
      `
      import { createThemeProvider } from '@compiled/css-in-js';

      createThemeProvider();
    `,
      { tokens }
    );

    expect(actual).not.toInclude(`import { createThemeProvider } from '@compiled/css-in-js';`);
  });

  it('should ensure compiled theme is imported', () => {
    const actual = transpileModule(
      `
      import { createThemeProvider } from '@compiled/css-in-js';

      createThemeProvider();
      `,
      { tokens }
    );

    expect(actual).toInclude(`import { CT } from '@compiled/css-in-js';`);
  });

  it.only('should replace function call with compiled provider', () => {
    const actual = transpileModule(
      `
      import { createThemeProvider } from '@compiled/css-in-js';

      createThemeProvider();
      `,
      { tokens }
    );

    expect(actual).toInclude(`asdasd`);
  });
});
