import ts from 'typescript';
import { ExpSimpleType, ExpGenericType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
export const isSimpleType = (type: ExpType): type is ExpSimpleType => type.type === 'type';
export const isGenericType = (type: ExpType): type is ExpGenericType => type.type === 'generic';
export const isUnionType = (type: ExpType): type is ExpUnionType => type.type === 'union';

const BOLT_BUILTIN_TO_NATIVE: Record<string, ts.KeywordTypeSyntaxKind> = {
  Any: ts.SyntaxKind.AnyKeyword,
  Boolean: ts.SyntaxKind.BooleanKeyword,
  Number: ts.SyntaxKind.NumberKeyword,
  String: ts.SyntaxKind.StringKeyword,
};

const NATIVE_TYPES = ['Any', 'Boolean', 'Number', 'String'];

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
      this.translateTypeExpression(expression.params[0]),
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

  private isBoltMap(expression: ExpType): boolean {
    // both Map<Anything, AnythingElse> and Anything[] are parsed to a Map
    return isGenericType(expression) && expression.name === 'Map';
  }

  // bolt does not allow a type that extends only native types and declares properties
  // so we don't have to worry about detecting that cant-assign-anything case and return true here
  // therefore, assumptions:
  // 1. if the schema has properties, it can be an object and we return true if every field can take null
  // 2. if the schema has no properties, then we can be null if derived is valueCanBeNull
  private isUserDefinedNullableType(expression: ExpType): boolean {
    if ((isSimpleType(expression) || isGenericType(expression)) && this.manifest[expression.name]) {
      const schema = this.manifest[expression.name];
      const propertyValues = Object.values(schema.properties);
      return propertyValues.length > 0
        ? propertyValues.every(this.valueCanBeNull.bind(this))
        : this.valueCanBeNull(schema.derivedFrom);
    }
    return false;
  }

  // returns true if a property typed with type expression can ever have a null value
  // there are no actual null values in firebase, the property is just not there, so in typescript
  // we have to mark the field as optional. this can happen if the expression is a union including Null
  // myField: String | Null; => myField?: string;
  // it can also happen that the expression is or is a union that includes a type that does not have any
  // required keys. E.g. Map<String, Boolean> or a type with declared properties, all of which are
  // unions including Null
  private valueCanBeNull(expression: ExpType): boolean {
    // the expression is a union containing Null
    return (
      this.isOptional(expression) ||
      // the expression is a Bolt syntax convenience for a map
      this.isBoltMap(expression) ||
      // the expression is a user-defined type that does not have any required values
      this.isUserDefinedNullableType(expression) ||
      // the expression is a union that includes any of the above
      (isUnionType(expression) && expression.types.some(this.valueCanBeNull.bind(this)))
    );
  }

  private translatePropertyDeclaration(name: string, definition: ExpType): ts.PropertySignature {
    let modifiedDefinition = definition;
    if (this.isOptional(definition)) {
      modifiedDefinition = {
        ...definition,
        types: definition.types.filter((type) => !isSimpleType(type) || type.name !== 'Null'),
      };
    }
    const questionMark = this.valueCanBeNull(definition) ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined;

    return factory.createPropertySignature(
      /* modifiers */ undefined,
      name,
      questionMark,
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
          expression.params.map(this.translateTypeExpression.bind(this))
        ),
      ];
    }
    return expression.types.reduce<ts.ExpressionWithTypeArguments[]>(
      (result, current) => [...result, ...this.makeExpressionWithTypeArgumentsArrayFromTypeNode(current)],
      []
    );
  }

  private isMapWithGivenKeyTypeArg(expression: ExpGenericType, param: string) {
    return (
      expression.name === 'Map' &&
      expression.params.length > 0 &&
      isSimpleType(expression.params[0]) &&
      expression.params[0].name === param
    );
  }

  // TODO what about MyType<A> extends MyOtherType<Something<A>, String, String> {}
  // i don't even know how to think about that. what are we checking for then?
  // that Something<X> resolves to X and B is passed as Map key arg? i guess so
  // but what is that "resolves" condition really?
  private isGenericTypeWithParameterUsedInRecordKey(type: ExpGenericType, param: string) {
    if (this.isMapWithGivenKeyTypeArg(type, param)) {
      return true;
    }
    // if it a user-defined type and we pass in the param we took, recurse to see if it aliases Map
    // with an arg we passed
    // MyType<A> extends MyOtherType<A, String, String> {}
    // MyOtherType<B, C, D> extends Map<B, Boolean> {}
    if (this.manifest[type.name]) {
      return type.params.some((passedParam, index) => {
        if (isSimpleType(passedParam) && passedParam.name === param) {
          const parentParams = this.manifest[type.name].params;
          if (parentParams) {
            return this.typeParameterUsedInRecordKey(parentParams[index], this.manifest[type.name]);
          }
        }
      });
    }
    return false;
  }

  // e.g. type A<K> extends Map<K, String> {}
  // in typescript, we have to constrain a type param if it is passed as the key type arg
  // to a Record
  private typeParameterUsedInRecordKey(param: string, schema: Schema): boolean {
    const parent = schema.derivedFrom;
    if (isGenericType(parent)) {
      return this.isGenericTypeWithParameterUsedInRecordKey(parent, param);
    }

    if (isUnionType(parent)) {
      return parent.types.some((type) => {
        return (
          isGenericType(type) && this.manifest[type.name] && this.isGenericTypeWithParameterUsedInRecordKey(type, param)
        );
      });
    }
    return false;
  }

  private translateTypeParameters(schema: Schema): ts.TypeParameterDeclaration[] | undefined {
    return (
      schema.params &&
      schema.params.map((param) =>
        factory.createTypeParameterDeclaration(
          /* name */ factory.createIdentifier(param),
          /* constraint */ this.typeParameterUsedInRecordKey(param, schema)
            ? factory.createUnionTypeNode([
                factory.createKeywordTypeNode(ts.SyntaxKind.SymbolKeyword),
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
              ])
            : undefined,
          /* default type */ undefined
        )
      )
    );
  }

  private translateTypeDeclarationToInterface(name: string, schema: Schema): ts.InterfaceDeclaration {
    const ancestors = this.makeExpressionWithTypeArgumentsArrayFromTypeNode(schema.derivedFrom);
    const hasAncestors = ancestors.length > 0;
    return factory.createInterfaceDeclaration(
      /* decorators */ undefined,
      /* modifiers */ [factory.createToken(ts.SyntaxKind.ExportKeyword)],
      name,
      /* type parameters */ this.translateTypeParameters(schema),
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
      /* decorators */ undefined,
      /* modifiers */ [factory.createToken(ts.SyntaxKind.ExportKeyword)],
      name,
      /* type parameters */ this.translateTypeParameters(schema),
      typeDefinition
    );
  }

  // replace any simple expression type with a name that is a key in specializations with the value there
  private specializeExpression(expression: ExpType, specializations: Record<string, ExpType>): ExpType {
    if (isUnionType(expression)) {
      return {
        ...expression,
        types: expression.types.map((type) => this.specializeExpression(type, specializations)),
      };
    }
    if (isGenericType(expression)) {
      // TODO i don't think a type parameter can appear as the name of a generic type??
      return {
        ...expression,
        params: expression.params.map((param) => this.specializeExpression(param, specializations)),
      };
    }
    return specializations[expression.name] || expression;
  }

  private isExtendableSpecialization(schema: Schema, typeArguments: ExpType[]): boolean {
    if (typeArguments.length !== schema.params?.length) {
      throw new Error(
        'Error determining if a specialization is concrete, type arguments provided is not the same length as schema params'
      );
    }
    const specializations: Record<string, ExpType> = {};
    schema.params?.forEach((param, index) => {
      specializations[param] = typeArguments[index];
    });

    return this.canBeExtended(this.specializeExpression(schema.derivedFrom, specializations));
  }

  private canBeExtended(expression: ExpType): boolean {
    if (isUnionType(expression)) {
      return expression.types.every(this.canBeExtended.bind(this));
    }
    if (isGenericType(expression)) {
      if (expression.name === 'Map') {
        // there are cases when Map extensisons can translate to
        // interfaces but the conditions are not exactly clear nor is
        // how we could implement the detection of those conditions.
        return false;
      }
      return (
        this.manifest[expression.name] &&
        this.isExtendableSpecialization(this.manifest[expression.name], expression.params)
      );
    }
    if (expression.name === 'Object') {
      return true;
    }
    if (this.isNative(expression)) {
      return false;
    }
    return this.manifest[expression.name] && this.canBeExtended(this.manifest[expression.name].derivedFrom);
  }

  private translateTopLevelTypeDeclaration(
    name: string,
    schema: Schema
  ): ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
    const extendable = this.canBeExtended(schema.derivedFrom);
    if (!extendable) {
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
