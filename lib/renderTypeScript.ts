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

const factory = ts.factory;

class AstTranslator {
  constructor(private readonly manifest: Record<string, Schema>) {}

  public GenerateDeclarationNodeArray(): ts.NodeArray<ts.TypeAliasDeclaration | ts.InterfaceDeclaration> {
    return factory.createNodeArray(
      Object.entries(this.manifest).map(([name, schema]) => this.translateTopLevelTypeDeclaration(name, schema))
    );
  }

  private isOptional(expression: ExpType): expression is ExpUnionType {
    return isUnionType(expression) && expression.types.some((type) => isSimpleType(type) && type.name === 'Null');
  }

  private hasProperties(schema: Schema): boolean {
    return schema.properties && Object.keys(schema.properties).length > 0;
  }

  private isNative(expression: ExpType) {
    return isSimpleType(expression) && NATIVE_TYPES.includes(expression.name);
  }

  private isNameOfSchemaDerivedFromNative(name: string): boolean {
    if (!this.manifest[name]) {
      return false;
    }
    return this.isNativeOrDescendant(this.manifest[name].derivedFrom);
  }

  // returns true if a type derived from this expression can take a native value, that is, this type:
  // 1. is a simple type that is a native type or
  // 2. is a simple type defined by the user (exists in the manifest), which can take a native value or
  // 3. is a union type containing 1 or 2
  private isNativeOrDescendant(expression: ExpType): boolean {
    return (
      // 1.
      this.isNative(expression) ||
      // 2.
      (isSimpleType(expression) && this.isNameOfSchemaDerivedFromNative(expression.name)) ||
      (isUnionType(expression) && expression.types.some(this.isNativeOrDescendant.bind(this)))
    );
  }

  private hasNativeAncestor(schema: Schema): boolean {
    return (
      (isUnionType(schema.derivedFrom) && schema.derivedFrom.types.some(this.isNative.bind(this))) ||
      this.isNative(schema.derivedFrom)
    );
  }

  private translateSimpleTypeExpression(
    builtin: string
  ): ts.KeywordTypeNode<ts.KeywordTypeSyntaxKind> | ts.TypeReferenceNode {
    if (Object.keys(BOLT_BUILTIN_TO_NATIVE).includes(builtin)) {
      return factory.createKeywordTypeNode(BOLT_BUILTIN_TO_NATIVE[builtin]);
    }
    return factory.createTypeReferenceNode(factory.createIdentifier(builtin), undefined);
  }

  private translateMapExpression(expression: ExpGenericType): ts.TypeReferenceNode {
    return factory.createTypeReferenceNode(factory.createIdentifier('Record'), [
      factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
      this.translateTypeExpression(expression.params[1]),
    ]);
  }

  private translateGenericTypeExpression(expression: ExpGenericType): ts.TypeReferenceNode {
    return expression.name === 'Map'
      ? this.translateMapExpression(expression)
      : factory.createTypeReferenceNode(
          factory.createIdentifier(expression.name),
          expression.params.map(this.translateTypeExpression.bind(this))
        );
  }

  private translateUnionType(expression: ExpUnionType): ts.UnionTypeNode {
    return factory.createUnionTypeNode(expression.types.map(this.translateTypeExpression.bind(this)));
  }

  private translateTypeExpression(expression: ExpType): ts.TypeNode {
    if (isSimpleType(expression)) {
      return this.translateSimpleTypeExpression(expression.name);
    }
    if (isGenericType(expression)) {
      return this.translateGenericTypeExpression(expression);
    }
    return this.translateUnionType(expression);
  }

  private translatePropertyDeclaration(name: string, definition: ExpType): ts.PropertySignature {
    let modifiedDefinition = definition;
    if (this.isOptional(definition)) {
      modifiedDefinition = {
        ...definition,
        types: definition.types.filter((type) => !isSimpleType(type) || type.name !== 'Null'),
      };
    }
    return factory.createPropertySignature(
      /* modifiers */ undefined,
      name,
      this.isOptional(definition) ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      this.translateTypeExpression(modifiedDefinition)
    );
  }

  private makeExpressionWithTypeArgumentsArrayFromTypeNode(expression: ExpType): ts.ExpressionWithTypeArguments[] {
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
          expression.types.map(this.translateTypeExpression.bind(this))
        ),
      ];
    }
    return expression.types.reduce<ts.ExpressionWithTypeArguments[]>(
      (result, current) => [...result, ...this.makeExpressionWithTypeArgumentsArrayFromTypeNode(current)],
      []
    );
  }

  private translateTypeDeclarationToInterface(name: string, schema: Schema): ts.InterfaceDeclaration {
    const ancestors = this.makeExpressionWithTypeArgumentsArrayFromTypeNode(schema.derivedFrom);
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
              this.makeExpressionWithTypeArgumentsArrayFromTypeNode(schema.derivedFrom)
            ),
          ]
        : undefined,
      Object.entries(schema.properties).map(([name, definition]) => this.translatePropertyDeclaration(name, definition))
    );
  }

  private translateTypeDeclarationToTypeAlias(name: string, schema: Schema): ts.TypeAliasDeclaration {
    let typeDefinition: ts.TypeNode;
    if (this.hasProperties(schema)) {
      typeDefinition = factory.createIntersectionTypeNode([
        this.translateTypeExpression(schema.derivedFrom),
        factory.createTypeLiteralNode(
          Object.entries(schema.properties).map(([name, definition]) =>
            this.translatePropertyDeclaration(name, definition)
          )
        ),
      ]);
    } else {
      typeDefinition = this.translateTypeExpression(schema.derivedFrom);
    }
    return factory.createTypeAliasDeclaration(
      undefined /* decorators */,
      [factory.createToken(ts.SyntaxKind.ExportKeyword)],
      name,
      undefined,
      typeDefinition
    );
  }

  private translateTopLevelTypeDeclaration(
    name: string,
    schema: Schema
  ): ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
    const canBeNative = this.isNativeOrDescendant(schema.derivedFrom);
    if (canBeNative) {
      return this.translateTypeDeclarationToTypeAlias(name, schema);
    }
    return this.translateTypeDeclarationToInterface(name, schema);
  }
}

const render = (root: Record<string, Schema>): string => {
  const printer = ts.createPrinter();
  const translator = new AstTranslator(root);
  const declarations = translator.GenerateDeclarationNodeArray();
  return printer.printList(
    ts.ListFormat.SourceFileStatements,
    declarations,
    ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest, undefined, ts.ScriptKind.TS)
  );
};

export default render;
