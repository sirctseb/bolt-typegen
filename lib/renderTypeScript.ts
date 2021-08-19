import ts from 'typescript';
import { ExpSimpleType, ExpGenericType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
export const isSimpleType = (type: ExpType): type is ExpSimpleType => type.type === 'type';
export const isGenericType = (type: ExpType): type is ExpGenericType => type.type === 'generic';
export const isUnionType = (type: ExpType): type is ExpUnionType => type.type === 'union';

const BOLT_BUILTIN_TO_NATIVE: Record<string, ts.KeywordTypeSyntaxKind> = {
  Boolean: ts.SyntaxKind.BooleanKeyword,
  Number: ts.SyntaxKind.NumberKeyword,
  String: ts.SyntaxKind.StringKeyword,
};

const NATIVE_TYPES = ['Boolean', 'Number', 'String'];

const isOptional = (expression: ExpType): expression is ExpUnionType => {
  return isUnionType(expression) && expression.types.some((type) => isSimpleType(type) && type.name === 'Null');
};

const hasProperties = (schema: Schema): boolean => {
  return schema.properties && Object.keys(schema.properties).length > 0;
};

const isNative = (expression: ExpType) => isSimpleType(expression) && NATIVE_TYPES.includes(expression.name);

const extendsNative = (schema: Schema) =>
  (isUnionType(schema.derivedFrom) && schema.derivedFrom.types.some(isNative)) || isNative(schema.derivedFrom);

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
