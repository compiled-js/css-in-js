import type { TransformOptions } from '../../test-utils';
import { transform as transformCode } from '../../test-utils';

describe('styled component behaviour', () => {
  beforeAll(() => {
    process.env.AUTOPREFIXER = 'off';
  });

  afterAll(() => {
    delete process.env.AUTOPREFIXER;
  });

  const transform = (code: string, opts: TransformOptions = {}) =>
    transformCode(code, { pretty: false, ...opts });

  it('should generate styled object call expression component code', () => {
    const code = `
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        fontSize: '20px',
      });
    `;

    const actual = transform(code, { pretty: true });

    expect(actual).toMatchInlineSnapshot(`
      "import { forwardRef } from \\"react\\";
      import * as React from \\"react\\";
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";
      const ListItem = forwardRef(({ as: C = \\"div\\", style, ...props }, ref) => (
        <CC>
          <CS>{[_]}</CS>
          <C
            {...props}
            style={style}
            ref={ref}
            className={ax([\\"_1wybgktf\\", props.className])}
          />
        </CC>
      ));

      if (process.env.NODE_ENV !== \\"production\\") {
        ListItem.displayName = \\"ListItem\\";
      }
      "
    `);
  });

  it('should generate styled tagged template expression component code', () => {
    const code = `
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `;

    const actual = transform(code, { pretty: true });

    expect(actual).toMatchInlineSnapshot(`
      "import { forwardRef } from \\"react\\";
      import * as React from \\"react\\";
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      const _ = \\"._1wybgktf{font-size:20px}\\";
      const ListItem = forwardRef(({ as: C = \\"div\\", style, ...props }, ref) => (
        <CC>
          <CS>{[_]}</CS>
          <C
            {...props}
            style={style}
            ref={ref}
            className={ax([\\"_1wybgktf\\", props.className])}
          />
        </CC>
      ));

      if (process.env.NODE_ENV !== \\"production\\") {
        ListItem.displayName = \\"ListItem\\";
      }
      "
    `);
  });

  it('should add an identifier nonce to the style element', () => {
    const code = `
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        font-size: \${props => props.color}px;
      \`;
    `;

    const actual = transform(code, { nonce: '__webpack_nonce__' });

    expect(actual).toInclude('<CS nonce={__webpack_nonce__}');
  });

  it('should compose CSS from multiple sources', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const styles = { fontSize: 12 };

      const ListItem = styled.div([
        styles,
        \`color: blue;\`,
        { fontWeight: 500 }
      ]);
    `);

    expect(actual).toInclude('{font-size:12px}');
    expect(actual).toInclude('{color:blue}');
    expect(actual).toInclude('{font-weight:500}');
  });

  it('should not destructure valid html attributes from props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.font({
        color: props => props.color,
      });
    `);

    expect(actual).toIncludeMultiple([
      '{as:C="font",style,...props}',
      '"--_1p69eoh":ix(props.color)',
    ]);
  });

  it('should destructure invalid html attributes from props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        fontSize: props => props.textSize,
      });
    `);

    expect(actual).toInclude('textSize,...props');
    expect(actual).toInclude('"--_fb92co":ix(textSize)');
  });

  it('should shortcircuit props with suffix to a empty string to avoid undefined in css', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        font-size: \${props => props.color}px;
      \`;
    `);

    expect(actual).toInclude('"--_1p69eoh":ix(props.color,"px")');
  });

  it('should prefix interpolation', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        font-size: -\${props => props.color}px;
      \`;
    `);

    expect(actual).toInclude('"--_1p69eoh-":ix(props.color,"px","-")');
  });

  it('creates a separate var name for positive and negative values of the same interpolation', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';      
      const random = Math.random;
      
      const LayoutRight = styled.aside\`
        margin-right: -\${random() * 5}px;
        margin-left: \${random() * 5}px;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._2hwxjtuq{margin-right:var(--_1hnpmp1-)}',
      '._18u01s7m{margin-left:var(--_1hnpmp1)}',
      '"--_1hnpmp1-":ix(random()*5,"px","-")',
      '"--_1hnpmp1":ix(random()*5,"px")',
      'ax(["_2hwxjtuq _18u01s7m",props.className]',
    ]);
  });

  it('should compose a component using tagged template expression', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = () => null;

      const ListItem = styled(Component)\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude('as:C=Component');
  });

  it('should compose a component using object call expression', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = () => null;

      const ListItem = styled(Component)({
        fontSize: 20
      });
    `);

    expect(actual).toInclude('as:C=Component');
  });

  it('should inline constant identifier string literal', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const fontSize = '20px';

      const ListItem = styled.div\`
        font-size: \${fontSize};
      \`;
    `);

    expect(actual).toInclude('{font-size:20px}');
  });

  it('should transform an arrow function with a body into an IIFE', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        color: props => { return props.color; },
      });
    `);

    expect(actual).toInclude('{color:var(--_1poneq5)}');
    expect(actual).toInclude('"--_1poneq5":ix((()=>{return props.color;})())');
  });

  it('should transform an arrow function with a body into an IIFE by preventing passing down invalid html attributes to the node', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        fontSize: props => { return props.textSize; },
      });
    `);

    expect(actual).toInclude('{font-size:var(--_1j0t240)}');
    expect(actual).toInclude('({as:C="div",style,textSize,...props},ref)');
    expect(actual).toInclude('"--_1j0t240":ix((()=>{return textSize;})())');
  });

  it('should move suffix and prefix of a dynamic arrow function with a body into an IIFE', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        content: \`"$\{props => { return props.color; }}"\`
      });
    `);

    expect(actual).toInclude('{content:var(--_1poneq5)}');
    expect(actual).toInclude('"--_1poneq5":ix((()=>{return props.color;})(),"\\"","\\"")');
  });

  it('should move suffix and prefix of a dynamic arrow function with a body into an IIFE by preventing passing down invalid html attributes to the node', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div({
        content: \`"$\{props => { return props.textSize; }}"\`
      });
    `);

    expect(actual).toInclude('{content:var(--_1j0t240)}');
    expect(actual).toInclude('({as:C="div",style,textSize,...props},ref)');
    expect(actual).toInclude('"--_1j0t240":ix((()=>{return textSize;})(),"\\"","\\"")');
  });

  it('should collect args as styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div(
        { color: 'darkorchid' },
        { fontSize: 12 },
      );
    `);

    expect(actual).toIncludeMultiple([
      '{color:darkorchid}',
      '{font-size:12px}',
      'ax(["_syaz1paq _1wyb1fwx",props.className])',
    ]);
  });

  it('should not throw when template literal CSS has no terminating semicolon', () => {
    expect(() => {
      transform(`
        import { styled } from '@compiled/react';

        const ListItem = styled.div(
          \`color: red\`,
          { fontSize: 20 }
        );
      `);
    }).not.toThrow();
  });

  it('should handle destructuring in interpolation functions', () => {
    const code = `
      import { styled } from '@compiled/react';
      import colors from 'colors';

      export const BadgeSkeleton = styled.span\`
        background-color: \${({ isLoading }) => (isLoading ? colors.N20 : colors.N40)};
        color: \${({ loading: l }) => (l ? colors.N50 : colors.N10)};
        border-color: \${(propz) => (propz.loading ? colors.N100 : colors.N200)};
      \`;
    `;

    const actual = transform(code, { pretty: true });

    expect(actual).toMatchInlineSnapshot(`
      "import { forwardRef } from \\"react\\";
      import * as React from \\"react\\";
      import { ax, ix, CC, CS } from \\"@compiled/react/runtime\\";
      import colors from \\"colors\\";
      const _6 = \\"._1h6d1qzc{border-color:var(--_96ptk)}\\";
      const _5 = \\"._1h6d1c5w{border-color:var(--_5rpikm)}\\";
      const _4 = \\"._syazs2l2{color:var(--_1oii75x)}\\";
      const _3 = \\"._syaz1c44{color:var(--_1ytezyk)}\\";
      const _2 = \\"._bfhk1lco{background-color:var(--_kcgnsd)}\\";
      const _ = \\"._bfhkhk3l{background-color:var(--_16ldrz5)}\\";
      export const BadgeSkeleton = forwardRef(
        ({ as: C = \\"span\\", style, isLoading, loading: l, ...props }, ref) => (
          <CC>
            <CS>{[_, _2, _3, _4, _5, _6]}</CS>
            <C
              {...props}
              style={{
                ...style,
                \\"--_16ldrz5\\": ix(colors.N20),
                \\"--_kcgnsd\\": ix(colors.N40),
                \\"--_1ytezyk\\": ix(colors.N50),
                \\"--_1oii75x\\": ix(colors.N10),
                \\"--_5rpikm\\": ix(colors.N100),
                \\"--_96ptk\\": ix(colors.N200),
              }}
              ref={ref}
              className={ax([
                \\"\\",
                isLoading ? \\"_bfhkhk3l\\" : \\"_bfhk1lco\\",
                l ? \\"_syaz1c44\\" : \\"_syazs2l2\\",
                propz.loading ? \\"_1h6d1c5w\\" : \\"_1h6d1qzc\\",
                props.className,
              ])}
            />
          </CC>
        )
      );

      if (process.env.NODE_ENV !== \\"production\\") {
        BadgeSkeleton.displayName = \\"BadgeSkeleton\\";
      }
      "
    `);
  });

  it('should handle an animation that references an inline @keyframes', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          to {
            opacity: 0;
          }
        }

        animation: fadeOut 2s ease-in-out;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      'const _2="._y44vk4ag{animation:fadeOut 2s ease-in-out}"',
      'const _="@keyframes fadeOut{0%{opacity:1}50%{opacity:0.5}to{opacity:0}}"',
      '<CS>{[_,_2]}</CS>',
      'className={ax(["_y44vk4ag",props.className])}',
    ]);
  });

  it('should not blow up with an expanding property', () => {
    expect(() =>
      transform(`
        import { styled } from '@compiled/react';

        export const BoardContent = styled.span\`
          flex: 1;
        \`;
      `)
    ).not.toThrow();
  });

  it('should apply conditional CSS with ternary operator', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.button\`
        color: \${(props) => (props.isPrimary ? 'blue' : 'red')};
        /* annoying-comment */ text-decoration-line: \${({ isDone }) => isDone ? 'line-through' : 'none'};
        -webkit-line-clamp: \${({ isClamped }) => isClamped ? 3 : 1};
        font-size: 30px;
        border: 2px solid blue;
        padding: 8px;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz5scu{color:red}',
      '._syaz13q2{color:blue}',
      '._1hms1911{text-decoration-line:line-through}',
      '._1hmsglyw{text-decoration-line:none}',
      '._1yyj11wp{-webkit-line-clamp:3}',
      '._1yyjkb7n{-webkit-line-clamp:1}',
      '._19bvftgi{padding-left:8px}',
      '._n3tdftgi{padding-bottom:8px}',
      '._u5f3ftgi{padding-right:8px}',
      '._ca0qftgi{padding-top:8px}',
      '._19itlf8h{border:2px solid blue}',
      '._1wyb1ul9{font-size:30px}',
      'ax(["_1wyb1ul9 _19itlf8h _ca0qftgi _u5f3ftgi _n3tdftgi _19bvftgi",props.isPrimary?"_syaz13q2":"_syaz5scu",isDone?"_1hms1911":"_1hmsglyw",isClamped?"_1yyj11wp":"_1yyjkb7n",props.className])',
    ]);
  });

  it('should apply conditional CSS with ternary operators and suffix', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        border-radius: \${(props) => props.isRounded ? 10 : 1}px !important;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._2rko19el{border-radius:10px!important}',
      '._2rko1aa3{border-radius:1px!important}',
      `ax([\"\",props.isRounded?\"_2rko19el\":\"_2rko1aa3\",props.className])`,
    ]);
  });

  it('should apply conditional CSS with ternary operator for object styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.button({
        color: (props) => (props.isPrimary ? 'blue' : 'red'),
        marginLeft: \`\${({ isLast }) => isLast ? 5 : 10}px\`,
        marginRight: ({ isLast }) => \`\${isLast ? 5 : 10}px\`,
      });
    `);

    expect(actual).toIncludeMultiple([
      '._syaz5scu{color:red}',
      '._syaz13q2{color:blue}',
      '._18u014y2{margin-left:5px}',
      '._18u019bv{margin-left:10px}',
      '._2hwx14y2{margin-right:5px}',
      '._2hwx19bv{margin-right:10px}',
      'ax(["",props.isPrimary?"_syaz13q2":"_syaz5scu",isLast?"_18u014y2":"_18u019bv",isLast?"_2hwx14y2":"_2hwx19bv",props.className])',
    ]);
  });

  it('should apply conditional CSS with ternary operator and tagged templates branches', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.button\`
        color: \${(props) => (props.isPrimary ? \`blue\` : \`red\`)};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz5scu{color:red}',
      '._syaz13q2{color:blue}',
      `ax([\"\",props.isPrimary?\"_syaz13q2\":\"_syaz5scu\",props.className])`,
    ]);
  });

  it('should apply conditional CSS with ternary operators, template literal branches containing props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';
      import { CUSTOM_WIDTH } from './constants';

      const ListItem = styled.div\`
        width: \${(props) => props.useCustomWidth ? \`\${CUSTOM_WIDTH}px\` : '100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1osq{width:100%}',
      '._1bsby2bc{width:var(--_znisgh)}',
      'style={{...style,"--_znisgh":ix(CUSTOM_WIDTH,"px")}}',
      `ax([\"\",props.useCustomWidth?\"_1bsby2bc\":\"_1bsb1osq\",props.className])`,
    ]);
  });

  it('should apply conditional CSS with ternary operators, template literal branches containing destructured props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';
      import { CUSTOM_WIDTH } from './constants';

      const ListItem = styled.div\`
        width: \${({ useCustomWidth }) => useCustomWidth ? \`\${CUSTOM_WIDTH}px\` : '100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1osq{width:100%}',
      '._1bsby2bc{width:var(--_znisgh)}',
      'style={{...style,"--_znisgh":ix(CUSTOM_WIDTH,"px")}}',
      `ax([\"\",useCustomWidth?\"_1bsby2bc\":\"_1bsb1osq\",props.className])`,
    ]);
  });

  it('should apply conditional CSS with ternary operators, template literal branches containing nested destructured props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        width: \${({ size: { width } }) => width ? \`\${width}px\` : '100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1osq{width:100%}',
      '._1bsb9tg7{width:var(--_1ea5ebz)}',
      '--_1ea5ebz":ix(width,"px"',
      'ax(["",width?"_1bsb9tg7":"_1bsb1osq",props.className]',
    ]);
  });

  it('should apply conditional CSS with ternary operators, template literal branches containing aliased destructured props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        width: \${({ elementWidth: width }) => width ? \`\${width}px\` : '100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1osq{width:100%}',
      '"._1bsb9tg7{width:var(--_1ea5ebz)}',
      '--_1ea5ebz":ix(width,"px")',
      'ax(["",width?"_1bsb9tg7":"_1bsb1osq",props.className])',
    ]);
  });

  it('should apply conditional CSS with ternary operators, template literal branches containing multiple destructured props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        width: \${({ width, offsetWidth }) => width && offsetWidth ? \`\${width + offsetWidth}px\` : '100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1osq{width:100%}',
      '._1bsb6mgu{width:var(--_1j1yxek)}',
      '--_1j1yxek":ix(width+offsetWidth,"px")',
      'ax(["",width&&offsetWidth?"_1bsb6mgu":"_1bsb1osq",props.className])',
    ]);
  });

  it('should add all props to component scope when using multiple destructures', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        width: \${({ width }) => \`\${width}px\`};
        height: \${({ height }) => \`\${height}px\`};
        border: \${({ borderWidth: bw, borderStyle  }) => \`\${bw}px \${borderStyle}\`};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{as:C="div",style,width,height,borderWidth:bw,borderStyle,...props}',
      '._1bsbvy8x{width:var(--_1qh7pvv)}',
      '._4t3i9q9r{height:var(--_gkul86)}',
      '._19it153k{border:var(--_nq5zie)}',
      `"--_1qh7pvv":ix(\`\${width}px\`)`,
      `"--_gkul86":ix(\`\${height}px\`)`,
      `"--_nq5zie":ix(\`\${bw}px \${borderStyle}\`)`,
      'className={ax(["_1bsbvy8x _4t3i9q9r _19it153k",props.className])}',
    ]);
  });

  it('should not add prop more than once to component scope when prop used in multiple destructures', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        width: \${({ width }) => \`\${width}px\`};
        height: \${({ width }) => \`\${width}px\`};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{as:C="div",style,width,...props}',
      '._1bsbvy8x{width:var(--_1qh7pvv)}',
      '._4t3ivy8x{height:var(--_1qh7pvv)}',
      `"--_1qh7pvv":ix(\`\${width}px\`)`,
      'className={ax(["_1bsbvy8x _4t3ivy8x",props.className])}',
    ]);
  });

  it('should apply conditional CSS with ternary operators, using "key: value" string branches containing destructured prop', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        \${({ width }) => width ? \`width: \${width}px\` : 'width: 100%'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{as:C="div",style,width,...props}',
      '._1bsb1osq{width:100%}',
      '._1bsb9tg7{width:var(--_1ea5ebz)}',
      '"--_1ea5ebz":ix(width,"px")',
      'className={ax(["",width?"_1bsb9tg7":"_1bsb1osq",props.className])}',
    ]);
  });

  it('should apply logical CSS with ternary operators, using "key: value" string containing destructured props', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const ListItem = styled.div\`
        \${({ width }) => width ? \`width: \${width}px)\` : undefined};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '{as:C="div",style,width,...props}',
      '._1bsb1r3a{width:var(--_1ea5ebz))}',
      '"--_1ea5ebz":ix(width,"px")',
      'className={ax(["",width&&"_1bsb1r3a",props.className])}',
    ]);
  });

  it('should apply conditional CSS with multiple ternary operators', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.button\`
        color: \${(props) => (props.isPrimary ? 'blue' : 'red')};
        border: \${(props) => (props.isPrimary ? '1px solid blue' : '1px solid red')};
        font-size: 30px;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._19it107e{border:1px solid red}',
      '._19it1nsd{border:1px solid blue}',
      '._syaz5scu{color:red}',
      '._syaz13q2{color:blue}',
      '._1wyb1ul9{font-size:30px}',
    ]);

    expect(actual).toInclude(
      `ax([\"_1wyb1ul9\",props.isPrimary?\"_syaz13q2\":\"_syaz5scu\",props.isPrimary?\"_19it1nsd\":\"_19it107e\",props.className]`
    );
  });

  it('should apply conditional CSS with nested ternary operators', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.button\`
        color: \${(props) => (props.isPrimary ? props.isDisabled ? 'black' : 'blue' : 'red')};
        font-size: 30px;
        border: 2px solid blue;
        padding: 8px;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._19bvftgi{padding-left:8px}',
      '._n3tdftgi{padding-bottom:8px}',
      '._u5f3ftgi{padding-right:8px}',
      '._ca0qftgi{padding-top:8px}',
      '._19itlf8h{border:2px solid blue}',
      '._1wyb1ul9{font-size:30px}',
      '._syaz5scu{color:red}',
      '._syaz13q2{color:blue}',
      '._syaz11x8{color:black}',
      `ax([\"_1wyb1ul9 _19itlf8h _ca0qftgi _u5f3ftgi _n3tdftgi _19bvftgi\",props.isPrimary?props.isDisabled?\"_syaz11x8\":\"_syaz13q2\":\"_syaz5scu\",props.className])`,
    ]);
  });

  it('should apply conditional CSS with template literal', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        color: red;
        background: white;
        border: 3px solid yellow;
        \${props => props.isPrimary && ({ color: 'blue' })};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._19it7fe6{border:3px solid yellow}',
      '._bfhk1x77{background-color:white}',
      '._syaz5scu{color:red}',
    ]);

    expect(actual).toInclude(
      'className={ax(["_syaz5scu _bfhk1x77 _19it7fe6",props.isPrimary&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply conditional CSS with template literal and nested ternary operators', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        background: white;
        \${props => props.isPrimary ? props.isDisabled ? { color: 'black' } : { color: 'blue' } : { color: 'red' }};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._bfhk1x77{background-color:white}',
      '._syaz11x8{color:black}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
    ]);
  });

  it('should apply conditional CSS with template literal, nested ternary operators, and different types', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        background: white;
        \${props => props.isPrimary ? props.isDisabled ? { color: 'black' } : 'color: blue' : \`color: red\`};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._bfhk1x77{background-color:white}',
      '._syaz11x8{color:black}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
      'className={ax(["_bfhk1x77",props.isPrimary?props.isDisabled?"_syaz11x8":"_syaz13q2":"_syaz5scu",props.className])}',
    ]);
  });

  it('should apply conditional CSS with template literal and multiple props lines', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        color: red;
        \${props => props.isPrimary && ({ color: 'blue' })};
        \${props => props.isBolded && ({ fontWeight: 'bold' })};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._k48p8n31{font-weight:bold}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
    ]);

    expect(actual).toInclude(
      'className={ax(["_syaz5scu",props.isPrimary&&"_syaz13q2",props.isBolded&&"_k48p8n31",props.className])}'
    );
  });

  it('should not allow a logical statement with a conditional right-hand side', () => {
    expect(() =>
      transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isShown && (props.isPrimary ? { color: 'blue' } : { color: 'green' })};
      \`;
    `)
    ).toThrow("ConditionalExpression isn't a supported CSS type");
  });

  it('should apply conditional CSS when using "key: value" in string form', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isPrimary ? 'color: green' : \`color: red\`};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._syaz5scu{color:red}',
      'className={ax(["",props.isPrimary?"_syazbf54":"_syaz5scu",props.className])}',
    ]);
  });

  it('should apply nested conditional CSS when using "key: value" in string form', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isPrimary ? 'color: blue' :  props.isGreen ? 'color: green' : 'color: red'};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
      'className={ax(["",props.isPrimary?"_syaz13q2":props.isGreen?"_syazbf54":"_syaz5scu",props.className])}',
    ]);
  });

  it('should apply conditional CSS when using "key: value; key: value; ..." in string form', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isPrimary ? 'color: green; font-size: 12px;' : \`color: red; font-size: 16px;\`};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._syaz5scu{color:red}',
      '._1wyb1fwx{font-size:12px}',
      '._1wybexct{font-size:16px}',
      'className={ax(["",props.isPrimary?"_syazbf54 _1wyb1fwx":"_syaz5scu _1wybexct",props.className])}',
    ]);
  });

  it('should apply conditional CSS when using inline mixins', () => {
    const actual = transform(`
      import { styled, css } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isPrimary ? css\`color: green\` : css({ color: 'red' })};
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._syaz5scu{color:red}',
      'className={ax(["",props.isPrimary?"_syazbf54":"_syaz5scu",props.className])}',
    ]);
  });

  it('should apply unconditional before and after a conditional css rule with template literal', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        color: red;
        background: white;
        \${props => props.isPrimary && ({ color: 'blue' })};
        border: 3px solid yellow;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._19it7fe6{border:3px solid yellow}',
      '._bfhk1x77{background-color:white}',
      '._syaz5scu{color:red}',
    ]);

    expect(actual).toInclude(
      '{ax(["_syaz5scu _bfhk1x77 _19it7fe6",props.isPrimary&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply unconditional after a conditional css rule with template literal', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        \${props => props.isPrimary && ({ color: 'blue' })};
        border: 3px solid yellow;
        color: red;
        background: white;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._bfhk1x77{background-color:white}',
      '._syaz5scu{color:red}',
      '._19it7fe6{border:3px solid yellow}',
    ]);

    expect(actual).toInclude(
      '{ax(["_19it7fe6 _syaz5scu _bfhk1x77",props.isPrimary&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply conditional CSS with object styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        props => props.isPrimary && ({ color: 'blue' }),
      );
    `);

    expect(actual).toIncludeMultiple(['._syaz13q2{color:blue}', '._syaz5scu{color:red}']);

    expect(actual).toInclude(
      'className={ax(["_syaz5scu",props.isPrimary&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply conditional CSS with object styles and multiple props lines', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        props => props.isPrimary && ({ color: 'blue' }),
        props => props.isBolded && ({ fontWeight: 'bold' }),
      );
    `);

    expect(actual).toIncludeMultiple([
      '._k48p8n31{font-weight:bold}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
    ]);

    expect(actual).toInclude(
      'className={ax(["_syaz5scu",props.isPrimary&&"_syaz13q2",props.isBolded&&"_k48p8n31",props.className])}'
    );
  });

  it('should apply unconditional before and after a conditional css rule with object styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        props => props.isPrimary && ({ color: 'blue' }),
        { border: '1px solid black'},
      );
    `);

    expect.toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._19it97hw{border:1px solid black}',
      '._syaz5scu{color:red}',
    ]);

    expect(actual).toInclude(
      '{ax(["_syaz5scu _19it97hw",props.isPrimary&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply conditional CSS with object styles regardless declaration order', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        props => props.isPrimary && ({ color: 'red' }),
        { color: 'blue' },
      );
    `);

    expect(actual).toIncludeMultiple(['._syaz5scu{color:red}', '._syaz13q2{color:blue}']);

    expect(actual).toInclude(
      'className={ax(["_syaz13q2",props.isPrimary&&"_syaz5scu",props.className])}'
    );
  });

  it('should apply multi conditional logical expression', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        props => (props.isPrimary || props.isMaybe) && ({ color: 'blue' }),
      );
    `);

    expect(actual).toIncludeMultiple(['._syaz13q2{color:blue}', '._syaz5scu{color:red}']);

    expect(actual).toInclude(
      '{ax(["_syaz5scu",(props.isPrimary||props.isMaybe)&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply multi conditional logical expression with different props lines and syntax styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        (props) => props.isPrimary && { color: 'blue' },
        { fontWeight: (props) => (props.isBolded ? 'bold' : 'normal')}
      );
    `);

    expect(actual).toIncludeMultiple([
      '._k48p8n31{font-weight:bold}',
      '._k48p4jg8{font-weight:normal}',
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
      '<C{...props}style={style}ref={ref}className={ax(["_syaz5scu",props.isPrimary&&"_syaz13q2",props.isBolded?"_k48p8n31":"_k48p4jg8",props.className])}/>',
    ]);
  });

  it('should apply the same CSS property with unconditional as default and multiple logical expressions', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        props => props.isPrimary && (props.isBolded || props.isFoo) && ({ color: 'blue' }),
      );
    `);

    expect(actual).toIncludeMultiple(['._syaz13q2{color:blue}', '._syaz5scu{color:red}']);

    expect(actual).toInclude(
      '{ax(["_syaz5scu",props.isPrimary&&(props.isBolded||props.isFoo)&&"_syaz13q2",props.className])}'
    );
  });

  it('should apply conditional CSS with ternary and boolean in the same line', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { fontSize: '20px' },
        props => props.isPrimary && props.isBolded ? ({ color: 'blue' }) : ({ color: 'red'}),
      );
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._syaz5scu{color:red}',
      '._1wybgktf{font-size:20px}',
      'className={ax(["_1wybgktf",props.isPrimary&&props.isBolded?"_syaz13q2":"_syaz5scu",props.className])}/',
    ]);
  });

  it('should only evaluate the last unconditional CSS rule for each property', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        { color: 'red' },
        { color: 'white', background: 'black' },
        { color: 'orange'},
        { background: 'white'},
      );
    `);

    expect(actual).toIncludeMultiple([
      '._bfhk1x77{background-color:white}',
      '._syazruxl{color:orange}',
    ]);

    expect(actual).toInclude('className={ax(["_syazruxl _bfhk1x77",props.className])}');
  });

  it('should only add falsy condition when truthy condition has no value', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        props => props.isPrimary ? undefined : { color: 'green', background: 'black' },
      );
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._bfhk11x8{background-color:black}',
      'className={ax(["",!props.isPrimary&&"_syazbf54 _bfhk11x8",props.className])}',
    ]);
  });

  it('should only add truthy condition when falsy condition has no value', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div(
        props => props.isPrimary ? { color: 'green', background: 'black' } : undefined,
      );
    `);

    expect(actual).toIncludeMultiple([
      '._syazbf54{color:green}',
      '._bfhk11x8{background-color:black}',
      'className={ax(["",props.isPrimary&&"_syazbf54 _bfhk11x8",props.className])}',
    ]);
  });

  it('should conditionally apply CSS mixins', () => {
    const actual = transform(`
      import { styled, css } from '@compiled/react';

      const dark = css\`
        background-color: black;
        color: white;
      \`;

      const light = css({
        'background-color': 'white',
        color: 'black',
      });

      const Component = styled.div\`
        \${(props) => (props.isDark ? dark : light)};
        font-size: 30px;
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz11x8{color:black}',
      '._bfhk1x77{background-color:white}',
      '._syaz1x77{color:white}',
      '_bfhk11x8{background-color:black}',
      '_1wyb1ul9{font-size:30px}',
      'className={ax(["_1wyb1ul9",props.isDark?"_bfhk11x8 _syaz1x77":"_bfhk1x77 _syaz11x8",props.className])}',
    ]);
  });

  it('falls back to using CSS variable when conditional is not sole expression in statement', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';
      const gutter = 10;

      const Component = styled.div\`
        width: calc(\${gutter}px + \${({ isLarge }) => isLarge ? 100 : 50}px);
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb60qm{width:calc(10px + var(--_15nkcot))}',
      '"--_15nkcot":ix(isLarge?100:50,"px")',
      '{ax(["_1bsb60qm",props.className])}',
    ]);
  });

  it('falls back to using CSS variable when conditional followed by another expression in statement', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';
      const gutter = 10;

      const Component = styled.div\`
        width: calc(\${({ isLarge }) => isLarge ? 100 : 50}px - \${gutter}px);
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1bsb1j3u{width:calc(var(--_15nkcot) - 10px)}',
      '"--_15nkcot":ix(isLarge?100:50,"px")',
      '{ax(["_1bsb1j3u",props.className])}',
    ]);
  });

  it('falls back to using CSS variable when conditional is inside quotes', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        :before {
          content: '\${({ isOpen }) => isOpen ? 'show less' : 'show more'}';
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1kt9x4xj:before{content:var(--_1boodpz)}',
      '"--_1boodpz":ix(isOpen?\'show less\':\'show more\',"\'","\'")',
      '{ax(["_1kt9x4xj",props.className])}',
    ]);
  });

  it('should apply conditional CSS to related selector', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        background: url('data:image/svg+xml; ... ');
        color: \${({ isSelected }) => isSelected ? 'blue' : 'yellow'};

        :hover {
          border: \${({ isHover }) => isHover ? '1px solid white' : '2px solid black'};
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      "._11q7qm1v{background:url('data:image/svg+xml; ... ')}",
      '._syaz13q2{color:blue}',
      '._syaz1gy6{color:yellow}',
      '._bfw71j9v:hover{border:1px solid white}',
      '_bfw7l468:hover{border:2px solid black}',
      '{ax(["_11q7qm1v",isSelected?"_syaz13q2":"_syaz1gy6",isHover?"_bfw71j9v":"_bfw7l468",props.className])}',
    ]);
  });

  it('should apply conditional CSS to related selector with object styles', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div({
        color: ({ isSelected }) => isSelected ? 'blue' : 'yellow',
        ':hover': {
          border: ({ isHover }) => isHover ? '1px solid white' : '2px solid black',
        }
      });
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._syaz1gy6{color:yellow}',
      '._bfw71j9v:hover{border:1px solid white}',
      '_bfw7l468:hover{border:2px solid black}',
      '{ax(["",isSelected?"_syaz13q2":"_syaz1gy6",isHover?"_bfw71j9v":"_bfw7l468",props.className])}',
    ]);
  });

  it('should apply conditional CSS to related nested selector', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        color: \${({ isSelected }) => isSelected ? 'blue' : 'yellow'};

        :hover {
          border: \${({ isHover }) => isHover ? '1px solid white' : '2px solid black'};
          background-color: cyan;

          :before {
            content: "Don't break closure parsing }";
            display:  \${({ isBefore }) => isBefore ? 'inherit' : 'inline'};
          }
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._syaz13q2{color:blue}',
      '._syaz1gy6{color:yellow}',
      '._bfw71j9v:hover{border:1px solid white}',
      '_bfw7l468:hover{border:2px solid black}',
      '._irr31i1c:hover{background-color:cyan}',
      '._vw871qok:hover:before{content:\\"Don\'t break closure parsing }\\"}',
      '._1jly1kw7:hover:before{display:inherit}',
      '._1jly1nu9:hover:before{display:inline}',
      '{ax(["_irr31i1c _vw871qok",isSelected?"_syaz13q2":"_syaz1gy6",isHover?"_bfw71j9v":"_bfw7l468",isBefore?"_1jly1kw7":"_1jly1nu9",props.className])}',
    ]);
  });

  it('does not conflict conditional CSS with above selectors', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        > span:first-type-of {
          color: red;
        }

        :hover {
          background-color: cyan;
        }

        :focus {
          border-radius: \${({ isFocus }) => isFocus ? 3 : 2}px;
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1oey5scu >span:first-type-of{color:red}',
      '._irr31i1c:hover{background-color:cyan}',
      '._vn891l7b:focus{border-radius:3px}',
      '._vn89yh40:focus{border-radius:2px}',
      '{ax(["_1oey5scu _irr31i1c",isFocus?"_vn891l7b":"_vn89yh40",props.className])}',
    ]);
  });

  it('does not conflict conditional CSS with below selectors', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        :focus {
          border-radius: \${({ isFocus }) => isFocus ? 3 : 2}px;
        }

        > span:first-type-of {
          color: red;
        }

        :hover {
          background-color: cyan;
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1oey5scu >span:first-type-of{color:red}',
      '._irr31i1c:hover{background-color:cyan}',
      '._vn891l7b:focus{border-radius:3px}',
      '._vn89yh40:focus{border-radius:2px}',
      '{ax(["_1oey5scu _irr31i1c",isFocus?"_vn891l7b":"_vn89yh40",props.className])}',
    ]);
  });

  it('does not conflict conditional CSS with surrounding selectors', () => {
    const actual = transform(`
      import { styled } from '@compiled/react';

      const Component = styled.div\`
        > span:first-type-of {
          color: red;
        }

        :focus {
          border-radius: \${({ isFocus }) => isFocus ? 3 : 2}px;
        }

        :hover {
          background-color: cyan;
        }
      \`;
    `);

    expect(actual).toIncludeMultiple([
      '._1oey5scu >span:first-type-of{color:red}',
      '._irr31i1c:hover{background-color:cyan}',
      '._vn891l7b:focus{border-radius:3px}',
      '._vn89yh40:focus{border-radius:2px}',
      '{ax(["_1oey5scu _irr31i1c",isFocus?"_vn891l7b":"_vn89yh40",props.className])}',
    ]);
  });
});
