import type { TransformOptions } from '../test-utils';
import { transform as transformCode } from '../test-utils';

describe('babel plugin', () => {
  const transform = (code: string, opts: TransformOptions = {}) =>
    transformCode(code, { comments: true, ...opts });

  it('should not change code where there is no compiled components', () => {
    const actual = transform(`const one = 1;`);

    expect(actual.trim()).toEqual('const one = 1;');
  });

  it('should not comment file if no transformation occurred', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react/runtime';
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import { ClassNames } from \\"@compiled/react/runtime\\";
      "
    `);
  });

  it('should generate fallback file comment when filename is not defined', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `);

    expect(actual).toInclude('File generated by @compiled/babel-plugin v0.0.0');
  });

  it('should generate fallback file comment when filename is defined', () => {
    const code = `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `;

    const actual = transform(code, { filename: 'test.tsx' });

    expect(actual).toInclude('test.tsx generated by @compiled/babel-plugin v0.0.0');
  });

  it('should transform basic styled component', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import { forwardRef } from \\"react\\";
      import * as React from \\"react\\";
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wyb1fwx{font-size:12px}\\";
      const MyDiv = forwardRef(
        ({ as: C = \\"div\\", style: __cmpls, ...__cmplp }, __cmplr) => {
          return (
            <CC>
              <CS>{[_]}</CS>
              <C
                {...__cmplp}
                style={__cmpls}
                ref={__cmplr}
                className={ax([\\"_1wyb1fwx\\", __cmplp.className])}
              />
            </CC>
          );
        }
      );
      if (process.env.NODE_ENV !== \\"production\\") {
        MyDiv.displayName = \\"MyDiv\\";
      }
      "
    `);
  });

  it('should transform basic css prop', () => {
    const actual = transform(`
      import '@compiled/react';

      const MyDiv = () => {
        return <div css="font-size:12px;">hello</div>
      };
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from \\"react\\";
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wyb1fwx{font-size:12px}\\";
      const MyDiv = () => {
        return (
          <CC>
            <CS>{[_]}</CS>
            {<div className={ax([\\"_1wyb1fwx\\"])}>hello</div>}
          </CC>
        );
      };
      "
    `);
  });

  // TODO Removing import React from 'react' breaks this test
  it('should preserve comments at the top of the processed file before inserting runtime imports', () => {
    const actual = transform(`
      // @flow strict-local
      import '@compiled/react';
      import React from 'react';

      const MyDiv = () => {
        return <div css="font-size:12px;">hello</div>
      };
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      // @flow strict-local
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      import React from \\"react\\";
      const _ = \\"._1wyb1fwx{font-size:12px}\\";
      const MyDiv = () => {
        return (
          <CC>
            <CS>{[_]}</CS>
            {<div className={ax([\\"_1wyb1fwx\\"])}>hello</div>}
          </CC>
        );
      };
      "
    `);
  });

  it('should not remove manual runtime import if no transformation occurs', () => {
    const actual = transform(`
      import { CC } from '@compiled/react/runtime';

      <CC>
        <div />
      </CC>
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import { CC } from \\"@compiled/react/runtime\\";
      <CC>
        <div />
      </CC>;
      "
    `);
  });

  it('should append to manual runtime import if already present and transformation occurs', () => {
    const actual = transform(`
      import { CC as CompiledRoot, ax } from '@compiled/react/runtime';
      import '@compiled/react';

      const classes = ax(['1', '2']);

      <CompiledRoot>
        <div css={{ display: 'block' }}  />
      </CompiledRoot>
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from \\"react\\";
      import { CC as CompiledRoot, ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1e0c1ule{display:block}\\";
      const classes = ax([\\"1\\", \\"2\\"]);
      <CompiledRoot>
        <CC>
          <CS>{[_]}</CS>
          {<div className={ax([\\"_1e0c1ule\\"])} />}
        </CC>
      </CompiledRoot>;
      "
    `);
  });

  it('should add component name if addComponentName is true', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      { addComponentName: true }
    );

    expect(actual).toInclude('c_MyDiv');
  });

  it('should compress class name for styled component', () => {
    const actual = transform(
      `
      import { styled } from '@compiled/react';

      const MyDiv = styled.div\`
        font-size: 12px;
      \`;
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._1wyb1fwx, .a{font-size:12px}',
      'ax(["_1wyb_a", __cmplp.className])',
    ]);
  });

  it('should compress class name for css props', () => {
    const actual = transform(
      `
      import '@compiled/react';

      <div css={{ fontSize: 12 }} />
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['._1wyb1fwx, .a{font-size:12px}', 'ax(["_1wyb_a"])']);
  });

  it('should not compress class name for ClassNames', () => {
    const actual = transform(
      `
      import { ClassNames } from '@compiled/react';

      <ClassNames>
        {({ css }) => (
          <div className={css({ fontSize: 12 })} />
        )}
      </ClassNames>
    `,
      {
        classNameCompressionMap: {
          '1wyb1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple(['._1wyb1fwx, .a{font-size:12px}', 'className={"_1wyb1fwx"}']);
  });

  it('should compress class names with atrules', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ "@media (max-width: 1250px) ": { fontSize: 12 } }} />
    `,
      {
        classNameCompressionMap: {
          pz521fwx: 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '@media (max-width:1250px){._pz521fwx, .a{font-size:12px}}',
      'ax(["_pz52_a"])',
    ]);
  });

  it('should compress pseudo classes', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ "&:hover": { fontSize: 12 }, "&:active": { color: 'red' } }} />
    `,
      {
        classNameCompressionMap: {
          '9h8h5scu': 'a',
          e9151fwx: 'b',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._9h8h5scu:active, .a:active{color:red}',
      '._e9151fwx:hover, .b:hover{font-size:12px}',
      'ax(["_e915_b _9h8h_a"])',
    ]);
  });

  it('should compress nested selector', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ '>div': { 'div div:hover': { fontSize: 12 } } }} />
    `,
      {
        classNameCompressionMap: {
          '1jkf1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._1jkf1fwx >div div div:hover, .a >div div div:hover{font-size:12px}',
      'ax(["_1jkf_a"]',
    ]);
  });

  it('should compress conditional class names', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={[{ fontSize: ({ bar }) => bar ? 14 : 16 }, () => foo ? { fontSize: 12 } : {}, baz && { fontSize: 20 }]} />
    `,
      {
        classNameCompressionMap: {
          '1jkf1fwx': 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._1jkf1fwx >div div div:hover, .a >div div div:hover{font-size:12px}',
      'ax(["_1jkf_a"]',
    ]);
  });

  it('should compress class names according to the map', () => {
    const actual = transform(
      `
      import '@compiled/react';
      <div css={{ fontSize: 12, color: 'red', marginTop: 10 }} />
    `,
      {
        classNameCompressionMap: {
          syaz5scu: 'a',
        },
      }
    );

    expect(actual).toIncludeMultiple([
      '._19pk19bv{margin-top:10px}',
      '._syaz5scu, .a{color:red}',
      '._1wyb1fwx{font-size:12px}',
      'ax(["_1wyb1fwx _syaz_a _19pk19bv"]',
    ]);
  });
});
