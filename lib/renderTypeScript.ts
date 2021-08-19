import ts from 'typescript';
import { ExpSimpleType, ExpGenericType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
export const isSimpleType = (type: ExpType): type is ExpSimpleType => type.type === 'type';
export const isGenericType = (type: ExpType): type is ExpGenericType => type.type === 'generic';
export const isUnionType = (type: ExpType): type is ExpUnionType => type.type === 'union';

// Private: Mappings from some Bolt built-in types to their TypeScript equivalents
const BOLT_BUILTIN_MAPPING: Record<string, string> = {
  Any: 'any',
  Boolean: 'boolean',
  Number: 'number',
  Null: 'null',
  Object: 'Object',
  String: 'string',
};

const BOLT_BUILTIN_TO_NATIVE: Record<string, ts.KeywordTypeSyntaxKind> = {
  Boolean: ts.SyntaxKind.BooleanKeyword,
  Number: ts.SyntaxKind.NumberKeyword,
  String: ts.SyntaxKind.StringKeyword,
};

const NATIVE_TYPES = ['Boolean', 'Number', 'String'];

function convertBuiltin(builtin: string): string {
  return BOLT_BUILTIN_MAPPING[builtin] || builtin;
}

const renderMapExpression = (expression: ExpGenericType): string => {
  return `Record<string, ${renderTypeExpression(expression.params[1])}>`;
};

const renderGenericTypeExpression = (expression: ExpGenericType): string => {
  return expression.name === 'Map'
    ? renderMapExpression(expression)
    : `${expression.name}<${expression.params.map(renderTypeExpression).join(', ')}>`;
};

const renderUnionType = (expression: ExpUnionType): string => {
  return `${expression.types.map(renderTypeExpression).join(' | ')}`;
};

const renderTypeExpression = (expression: ExpType): string => {
  if (isSimpleType(expression)) {
    return convertBuiltin(expression.name);
  }
  if (isGenericType(expression)) {
    return renderGenericTypeExpression(expression);
  }
  return renderUnionType(expression);
};

const renderExtension = (schema: Schema): string => {
  const nativeExtension = extendsNative(schema);
  if (nativeExtension) {
    if (isUnionType(schema.derivedFrom)) {
      // if a type does not declare any properties, we don't want the parentheses around the ancestors
      if (!hasProperties(schema)) {
        return `= ${renderTypeExpression(schema.derivedFrom)}`;
      }
      return `= (${renderTypeExpression(schema.derivedFrom)})`;
    } else {
      return `= ${renderTypeExpression(schema.derivedFrom)}`;
    }
  }

  let parent;
  if (isUnionType(schema.derivedFrom)) {
    // we omit Object from the ancestor union when declaring an interface
    const ancestors = schema.derivedFrom.types.filter((type) => !isSimpleType(type) || type.name !== 'Object');
    // if Objects was the only ancestor, omit the extension entirely
    if (ancestors.length === 0) {
      return '';
    }
    return `extends ${ancestors.map(renderTypeExpression).join(' | ')}`;
  } else if (isSimpleType(schema.derivedFrom) && schema.derivedFrom.name === 'Object') {
    // if the type was only derived from Object, omit the extension entirely
    return '';
  } else {
    return `extends ${renderTypeExpression(schema.derivedFrom)}`;
  }
};

const renderParams = (schema: Schema): string =>
  schema.params && schema.params.length ? `<${schema.params.join(', ')}>` : '';

const isOptional = (expression: ExpType): expression is ExpUnionType => {
  return isUnionType(expression) && expression.types.some((type) => isSimpleType(type) && type.name === 'Null');
};

const renderProperty = (name: string, definition: ExpType): string => {
  if (isOptional(definition)) {
    return `${name}?: ${renderTypeExpression({
      ...definition,
      types: definition.types.filter((type) => !isSimpleType(type) || type.name !== 'Null'),
    })};`;
  }
  return `${name}: ${renderTypeExpression(definition)};`;
};

const renderProperties = (schema: Schema): string => {
  if (hasProperties(schema)) {
    return `${extendsNative(schema) ? ' & ' : ''}{\n  ${Object.entries(schema.properties)
      .map(([name, definition]) => renderProperty(name, definition))
      .join('\n  ')}\n}`;
  } else {
    return ';';
  }
};

const hasProperties = (schema: Schema): boolean => {
  return schema.properties && Object.keys(schema.properties).length > 0;
};

const extendsNative = (schema: Schema) =>
  (isUnionType(schema.derivedFrom) &&
    schema.derivedFrom.types.some((type) => isSimpleType(type) && NATIVE_TYPES.includes(type.name))) ||
  (isSimpleType(schema.derivedFrom) && NATIVE_TYPES.includes(schema.derivedFrom.name));

const renderTopLevelType = (name: string, schema: Schema): string => {
  const nativeExtension = extendsNative(schema);
  return nativeExtension
    ? `export type ${name}${renderParams(schema)} ${renderExtension(schema)}${renderProperties(schema)}`
    : `export interface ${name}${renderParams(schema)} ${renderExtension(schema)}${renderProperties(schema)}`;
};

const renderOld = (root: Record<string, Schema>): string => {
  return (
    Object.entries(root)
      .map(([name, schema]) => renderTopLevelType(name, schema))
      .join('\n') + '\n'
  );
};

const factory = ts.factory;

const translateSimpleTypeExpression = (
  builtin: string
): ts.KeywordTypeNode<ts.KeywordTypeSyntaxKind> | ts.TypeReferenceNode => {
  if (Object.keys(BOLT_BUILTIN_TO_NATIVE).includes(builtin)) {
    return factory.createKeywordTypeNode(BOLT_BUILTIN_TO_NATIVE[builtin]);
  }
  return factory.createTypeReferenceNode(factory.createIdentifier(builtin), undefined);
};

const translateMapExpression = (expression: ExpGenericType): ts.TypeReferenceNode => {
  return factory.createTypeReferenceNode(factory.createIdentifier('Record'), [
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    translateTypeExpression(expression.params[1]),
  ]);
};

const translateGenericTypeExpression = (expression: ExpGenericType): ts.TypeReferenceNode => {
  return expression.name === 'Map'
    ? translateMapExpression(expression)
    : factory.createTypeReferenceNode(
        factory.createIdentifier(expression.name),
        expression.params.map(translateTypeExpression)
      );
};

const translateUnionType = (expression: ExpUnionType): ts.UnionTypeNode => {
  return factory.createUnionTypeNode(expression.types.map(translateTypeExpression));
};

const translateTypeExpression = (expression: ExpType): ts.TypeNode => {
  if (isSimpleType(expression)) {
    return translateSimpleTypeExpression(expression.name);
  }
  if (isGenericType(expression)) {
    return translateGenericTypeExpression(expression);
  }
  return translateUnionType(expression);
};

const translatePropertyDeclaration = (name: string, definition: ExpType) => {
  let modifiedDefinition = definition;
  if (isOptional(definition)) {
    modifiedDefinition = {
      ...definition,
      types: definition.types.filter((type) => !isSimpleType(type) || type.name !== 'Null'),
    };
  }
  return factory.createPropertySignature(
    /* modifiers */ undefined,
    name,
    isOptional(definition) ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    translateTypeExpression(modifiedDefinition)
  );
};

const makeExpressionWithTypeArgumentsArrayFromTypeNode = (expression: ExpType): ts.ExpressionWithTypeArguments[] => {
  if (isSimpleType(expression)) {
    if (expression.name !== 'Object') {
      return [factory.createExpressionWithTypeArguments(factory.createIdentifier(expression.name), [])];
    }
    return [];
  }
  if (isGenericType(expression)) {
    return [
      factory.createExpressionWithTypeArguments(
        factory.createIdentifier(expression.name),
        expression.types.map(translateTypeExpression)
      ),
    ];
  }
  return expression.types.reduce<ts.ExpressionWithTypeArguments[]>(
    (result, current) => [...result, ...makeExpressionWithTypeArgumentsArrayFromTypeNode(current)],
    []
  );
};

const translateTypeDeclarationToInterface = (name: string, schema: Schema): ts.InterfaceDeclaration => {
  const ancestors = makeExpressionWithTypeArgumentsArrayFromTypeNode(schema.derivedFrom);
  const hasAncestors = ancestors.length > 0;
  return factory.createInterfaceDeclaration(
    /* decorators */ undefined,
    /* modifiers */ [factory.createToken(ts.SyntaxKind.ExportKeyword)],
    name,
    /* type parameters */ undefined,
    /* heritage clause */ hasAncestors
      ? [
          factory.createHeritageClause(
            ts.SyntaxKind.ExtendsKeyword,
            makeExpressionWithTypeArgumentsArrayFromTypeNode(schema.derivedFrom)
          ),
        ]
      : undefined,
    Object.entries(schema.properties).map(([name, definition]) => translatePropertyDeclaration(name, definition))
  );
};
const translateTypeDeclarationToTypeAlias = (name: string, schema: Schema): ts.TypeAliasDeclaration => {
  let typeDefinition: ts.TypeNode;
  if (hasProperties(schema)) {
    typeDefinition = factory.createIntersectionTypeNode([
      translateTypeExpression(schema.derivedFrom),
      factory.createTypeLiteralNode(
        Object.entries(schema.properties).map(([name, definition]) => translatePropertyDeclaration(name, definition))
      ),
    ]);
  } else {
    typeDefinition = translateTypeExpression(schema.derivedFrom);
  }
  return factory.createTypeAliasDeclaration(
    undefined /* decorators */,
    [factory.createToken(ts.SyntaxKind.ExportKeyword)],
    name,
    undefined,
    typeDefinition
  );
};

const translateTopLevelTypeDeclaration = (
  name: string,
  schema: Schema
): ts.InterfaceDeclaration | ts.TypeAliasDeclaration => {
  const nativeExtension = extendsNative(schema);
  if (nativeExtension) {
    return translateTypeDeclarationToTypeAlias(name, schema);
  }
  return translateTypeDeclarationToInterface(name, schema);
};

const render = (root: Record<string, Schema>): string => {
  const printer = ts.createPrinter();
  const declarations = factory.createNodeArray(
    Object.entries(root).map(([name, schema]) => translateTopLevelTypeDeclaration(name, schema))
  );
  return printer.printList(
    ts.ListFormat.SourceFileStatements,
    declarations,
    ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest, undefined, ts.ScriptKind.TS)
  );
};

export default render;
