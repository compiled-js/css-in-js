import type * as t from '@babel/types';

import type { Metadata } from '../../../../types';
import { resolveBindingNode } from '../../../ast';
import { createResultPair } from '../../common';

export const evaluateIdentifier = (
  expression: t.Identifier,
  meta: Metadata
): ReturnType<typeof createResultPair> => {
  const { name } = expression;
  const resolvedBinding = resolveBindingNode(name, meta);

  if (resolvedBinding) {
    const { constant, node, meta: updatedMeta } = resolvedBinding;

    if (constant && node) {
      return createResultPair(node as t.Expression, updatedMeta);
    }
  }

  return createResultPair(expression, meta);
};
