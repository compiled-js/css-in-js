import { transformSync } from '@babel/core';
import babelPlugin from '../../index';

const transform = (code: string, nonce?: string) => {
  return transformSync(code, {
    configFile: false,
    babelrc: false,
    compact: false,
    plugins: [[babelPlugin, { nonce }]],
  })?.code;
};

describe('class names behaviour', () => {
  it('should transform class names single usage', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {({ css }) => (<div className={css({ fontSize: '20px' })}>hello, world!</div>)}
        </ClassNames>
      );
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";

      const ListItem = () => <CC>
          <CS>{[_]}</CS>
          {<div className={\\"_1wybgktf\\"}>hello, world!</div>}
        </CC>;"
    `);
  });

  it('should transform children as function with body', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {({ css }) => {
            return <div className={css({ fontSize: '20px' })}>hello, world!</div>;
          }}
        </ClassNames>
      );
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";

      const ListItem = () => <CC>
          <CS>{[_]}</CS>
          {(() => {
          return <div className={\\"_1wybgktf\\"}>hello, world!</div>;
        })()}
        </CC>;"
    `);
  });

  xit('should transform style property access', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {(props) => (<div style={props.style} className={props.css({ fontSize: '20px' })}>hello, world!</div>)}
        </ClassNames>
      );
    `);

    expect(actual).toMatchInlineSnapshot(`
      "import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";

      const ListItem = () => <CC>
          <CS>{[_]}</CS>
          {<div style={undefined} className={\\"_1wybgktf\\"}>hello, world!</div>}
        </CC>;"
    `);
  });

  xit('should not transform class names invalid prop single usage', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {(props) => (<div className={dontexist.css({ fontSize: '20px' })}>hello, world!</div>)}
        </ClassNames>
      );
    `);

    expect(actual).toEqual(false);
  });

  xit('should transform class names renamed prop single usage', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {({ css: c }) => (<div className={c({ fontSize: '20px' })}>hello, world!</div>)}
        </ClassNames>
      );
    `);

    expect(actual).not.toInclude(`import { ClassNames } from "@compiled/react";`);
  });

  it('should transform class names multiple usage', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {({ css }) => (
            <div
              className={{
                button: css({ color: 'red', fontSize: 20 }),
                container: css({ color: 'blue', fontSize: 20 }),
              }}>hello, world!</div>
          )}
        </ClassNames>
      );
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _3 = \\"._syaz13q2{color:blue}\\";
      const _2 = \\"._1wybgktf{font-size:20px}\\";
      const _ = \\"._syaz5scu{color:red}\\";

      const ListItem = () => <CC>
          <CS>{[_, _2, _3]}</CS>
          {<div className={{
          button: \\"_syaz5scu _1wybgktf\\",
          container: \\"_syaz13q2 _1wybgktf\\"
        }}>hello, world!</div>}
        </CC>;"
    `);
  });

  it('should transform class names renamed usage', () => {
    const actual = transform(`
      import { ClassNames as CN } from '@compiled/react';

      const ListItem = () => (
        <CN>
          {({ css }) => <div className={css({ fontSize: '20px' })}>hello, world!</div>}
        </CN>
      );
    `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";

      const ListItem = () => <CC>
          <CS>{[_]}</CS>
          {<div className={\\"_1wybgktf\\"}>hello, world!</div>}
        </CC>;"
    `);
  });

  it('should add an identifier nonce to the style element', () => {
    const actual = transform(
      `
      import { ClassNames } from '@compiled/react';

      const ListItem = () => (
        <ClassNames>
          {({ css }) => (<div className={css({ fontSize: '20px' })}>hello, world!</div>)}
        </ClassNames>
      );
      `,
      '__webpack_nonce__'
    );

    expect(actual).toInclude('<CS nonce={__webpack_nonce__}>');
  });

  it('should transform children as function return', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const ListItem = ({ children }) => (
        <ClassNames>
          {({ css }) => children(css({ fontSize: '20px' }))}
        </ClassNames>
      );
   `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";

      const ListItem = ({
        children
      }) => <CC>
          <CS>{[_]}</CS>
          {children(\\"_1wybgktf\\")}
        </CC>;"
    `);
  });

  it('should place self closing jsx element as a child', () => {
    const actual = transform(`
    import { ClassNames } from '@compiled/react';

    const ZoomOnHover = ({ children }) => (
      <ClassNames>
        {({ css }) => <div className={css({ fontSize: 12 })} />}
      </ClassNames>
    );
  `);

    expect(actual).toInclude(`<div className={\"_1wyb1fwx\"} /`);
  });

  it('should replace style identifier with undefined', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const Component = ({ children }) => (
        <ClassNames>
          {({ css, style }) => <div style={style} className={css({ fontSize: 12 })} />}
        </ClassNames>
      );
  `);

    expect(actual).toInclude(`style={undefined}`);
  });

  it('should replace style identifier with css variable object', () => {
    const actual = transform(`
      import { ClassNames } from '@compiled/react';

      const Component = ({ children, color }) => (
        <ClassNames>
          {({ css, style }) => <div style={style} className={css({ color })} />}
        </ClassNames>
      );
  `);

    expect(actual).toMatchInlineSnapshot(`
      "/* File generated by @compiled/babel-plugin v0.0.0 */
      import * as React from 'react';
      import { ax, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._syaz1aj3{color:var(--_1ylxx6h)}\\";

      const Component = ({
        children,
        color
      }) => <CC>
          <CS>{[_]}</CS>
          {<div style={{
          \\"--_1ylxx6h\\": color
        }} className={\\"_syaz1aj3\\"} />}
        </CC>;"
    `);
  });
});
