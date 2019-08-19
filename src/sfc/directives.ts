import * as t from '@babel/types'
import { getNextJSXElment } from './sfc-ast-helpers';

const { log, getIdentifier } = require('../utils');
const eventMap = require('./event-map');

export function handleIfDirective (path, value, state) {
    const parentPath = path.parentPath.parentPath;
    const childs = parentPath.node.children;

    // Get JSXElment of v-else
    const nextElement = getNextJSXElment(parentPath);
    const test = state.computeds[value] ? t.identifier(value) : t.memberExpression(
        t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
        t.identifier(value)
    );

    parentPath.replaceWith(
        t.jsxExpressionContainer(
            t.conditionalExpression(
                test,
                parentPath.node,
                nextElement ? nextElement : t.nullLiteral()
            )
        )
    );

    path.remove();
};

export function handleShowDirective (path, value, state) {
    const test = state.computeds[value] ? t.identifier(value) : t.memberExpression(
        t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
        t.identifier(value)
    );

    path.replaceWith(
        t.jsxAttribute(
            t.jsxIdentifier('style'),
            t.jsxExpressionContainer(
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('display'),
                        t.conditionalExpression(
                            test,
                            t.stringLiteral('block'),
                            t.stringLiteral('none')
                        )
                    )
                ])
            )
        )
    );
};

export function handleOnDirective (path, name, value) {
    const eventName = eventMap[name];
    if (!eventName) {
        log(`Not support event name`);
        return;   
    }

    path.replaceWith(
        t.jsxAttribute(
            t.jsxIdentifier(eventName),
            t.jsxExpressionContainer(
                t.memberExpression(
                    t.thisExpression(),
                    t.identifier(value)
                )
            )
        )
    );
};

export function handleBindDirective (path, name, value, state) {
    if (state.computeds[value]) {
        path.replaceWith(
            t.jsxAttribute(
                t.jsxIdentifier(name),
                t.jsxExpressionContainer(t.identifier(value))
            )
        );
        return;
    }
    path.replaceWith(
        t.jsxAttribute(
            t.jsxIdentifier(name),
            t.jsxExpressionContainer(
                t.memberExpression(
                    t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
                    t.identifier(value)
                )
            )
        )
    );
};

export function handleForDirective (path, value, definedInFor, state) {
    const parentPath = path.parentPath.parentPath;
    const childs = parentPath.node.children;
    const element = parentPath.node.openingElement.name.name;

    const a = value.split(/\s+?in\s+?/);
    const prop = a[1].trim();

    const params = a[0].replace('(', '').replace(')', '').split(',');
    const newParams = [];
    params.forEach(item => {
        definedInFor.push(item.trim());
        newParams.push(t.identifier(item.trim()));
    });

    const member = state.computeds[prop] ? t.identifier(prop) : t.memberExpression(
        t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
        t.identifier(prop)
    );

    parentPath.replaceWith(
        t.jsxExpressionContainer(
            t.callExpression(
                t.memberExpression(
                    member,
                    t.identifier('map')
                ),
                [
                    t.arrowFunctionExpression(
                        newParams,
                        t.blockStatement([
                            t.returnStatement(
                                t.jsxElement(
                                    t.jsxOpeningElement(t.jsxIdentifier(element), [
                                        t.jsxAttribute(
                                            t.jsxIdentifier('key'),
                                            t.jsxExpressionContainer(
                                                t.identifier('index')
                                            )
                                        )
                                    ]),
                                    t.jsxClosingElement(t.jsxIdentifier(element)),
									childs,
									false,
                                )
                            )
                        ])
                    )
                ]
            )
        )
    );
};

export function handleTextDirective (path, value, state) {
    const parentPath = path.parentPath.parentPath;

    if (state.computeds[value]) {
        parentPath.node.children.push(
            t.jsxExpressionContainer(
                t.callExpression(
                    t.memberExpression(
                        t.identifier(value),
                        t.identifier('replace')
                    ),
                    [
                        t.regExpLiteral('<[^>]+>', 'g'),
                        t.stringLiteral('')
                    ]
                )
            )
        );
        return;
    }

    parentPath.node.children.push(
        t.jsxExpressionContainer(
            t.callExpression(
                t.memberExpression(
                    t.memberExpression(
                        t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
                        t.identifier(value)
                    ),
                    t.identifier('replace')
                ),
                [
                    t.regExpLiteral('<[^>]+>', 'g'),
                    t.stringLiteral('')
                ]
            )
        )
    );
};

export function handleHTMLDirective (path, value, state) {
    const val = state.computeds[value] ? t.identifier(value) : t.memberExpression(
        t.memberExpression(t.thisExpression(), getIdentifier(state, value)),
        t.identifier(value)
    );

    path.replaceWith(
        t.jsxAttribute(
            t.jsxIdentifier('dangerouslySetInnerHTML'),
            t.jsxExpressionContainer(
                t.objectExpression(
                    [
                        t.objectProperty(t.identifier('__html'), val)
                    ]
                )
            )
        )
    )
};
