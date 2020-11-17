import { declare } from '@babel/helper-plugin-utils';
import template from '@babel/template';
import * as t from '@babel/types';
import jsxSyntax from '@babel/plugin-syntax-jsx';
import { importSpecifier } from './utils/ast-builders';
import { Cache } from './utils/cache';
import { visitCssPropPath } from './css-prop';
import { visitStyledPath } from './styled';
import { State } from './types';

const cache = new Cache();

export default declare<State>((api) => {
  api.assertVersion(7);

  return {
    inherits: jsxSyntax,
    pre() {
      this.sheets = {};

      cache.initialize(this.opts);
      this.cache = cache;
    },
    visitor: {
      Program: {
        exit(path, state) {
          if (state.compiledImports && !path.scope.getBinding('React')) {
            // React is missing - add it in at the last moment!
            path.unshiftContainer('body', template.ast(`import * as React from 'react'`));
          }
        },
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value !== '@compiled/react') {
          return;
        }

        // The presence of the module enables CSS prop
        state.compiledImports = {};

        // Go through each import and enable each found API
        path.get('specifiers').forEach((specifier) => {
          if (!state.compiledImports || !specifier.isImportSpecifier()) {
            // Bail out early
            return;
          }

          if (specifier.node.imported.name === 'styled') {
            // Enable styled API with the local name
            state.compiledImports.styled = specifier.node.local.name;

            // Remove specifier
            specifier.remove();
          }
        });

        // Add the runtime entrypoint module
        path.insertBefore(
          t.importDeclaration(
            [importSpecifier('ax'), importSpecifier('CC'), importSpecifier('CS')],
            t.stringLiteral('@compiled/react/runtime')
          )
        );

        if (path.node.specifiers.length === 0) {
          // No more imports - remove the whole lot!
          path.remove();
        }
      },
      TaggedTemplateExpression(path, state) {
        if (!state.compiledImports?.styled) {
          return;
        }

        visitStyledPath(path, { state, parentPath: path });
      },
      CallExpression(path, state) {
        if (!state.compiledImports) {
          return;
        }

        visitStyledPath(path, { state, parentPath: path });
      },
      JSXOpeningElement(path, state) {
        if (!state.compiledImports) {
          return;
        }

        visitCssPropPath(path, { state, parentPath: path });
      },
    },
  };
});
