import {parse} from '@babel/parser'
import * as t from '@babel/types'
import traverse from '@babel/traverse'

import { log, getIdentifier } from '../utils';
import { 
    handleIfDirective, handleShowDirective, handleOnDirective,
    handleForDirective, handleTextDirective, handleHTMLDirective,
    handleBindDirective
} from './directives';

export const prepareTemplate = (template: string): string =>
	template
		.replace(/{{/g, '{')
		.replace(/}}/g, '}')

export function traverseTemplate (tast: t.File, state) {
    let argument = null;
    // cache some variables are defined in v-for directive
    const definedInFor = [];

    traverse(tast, {
        ExpressionStatement: {
            enter (path) {
                
            },
            exit (path) {
                argument = path.node.expression;
            }
        },

        JSXAttribute (path) {
			const node = path.node;
			
			// @ts-ignore
            const value = node.value.value;

            if (!node.name) {
                return;
            }

            if (node.name.name === 'class') {
                path.replaceWith(
                    t.jsxAttribute(t.jsxIdentifier('className'), node.value)
                );
                /* eslint-disable */
                return; // path.stop();
            } else if (node.name.name === 'v-if') {
                handleIfDirective(path, value, state);
            } else if (node.name.name === 'v-show') {
                handleShowDirective(path, value, state);
            } else if (t.isJSXNamespacedName(node.name)) {
                // v-bind/v-on
                if (node.name.namespace.name === 'v-on') {
                    handleOnDirective(path, node.name.name.name, value);
                } else if (node.name.namespace.name === 'v-bind') {
                    handleBindDirective(path, node.name.name.name, value, state);
                }
            } else if (node.name.name === 'v-for') {
                handleForDirective(path, value, definedInFor, state);
            } else if (node.name.name === 'v-text') {
                handleTextDirective(path, value, state);
                path.remove();
            } else if (node.name.name === 'v-html') {
                handleHTMLDirective(path, value, state);
            }
        },

        JSXExpressionContainer (path) {
            const expression = path.node.expression;
			// @ts-ignore
            const name = expression.name;
    
            if (t.isBinaryExpression(expression)) {
                log('[vue-to-react]: Maybe you are using filter expression, but vtr is not supports it.');
                return;
            }

            // from computed
            if (state.computeds[name]) {
                return;
            }

            // path.container: Fix replace for loop expression error
            if (name && !definedInFor.includes(name) && path.container) {
                path.replaceWith(
                    t.jsxExpressionContainer(t.memberExpression(
                        t.memberExpression(t.thisExpression(), getIdentifier(state, name)),
                        t.identifier(name)
                    ))
                );
                // return;
            }
        }
    });

    return argument; 
};
