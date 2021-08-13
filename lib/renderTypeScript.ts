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

const renderProperties = (schema: Schema): string => {
  if (schema.properties && Object.keys(schema.properties).length) {
    return `${extendsNative(schema) ? ' & ' : ''}{\n  ${Object.entries(schema.properties)
      .map(([name, definition]) => `${name}: ${renderTypeExpression(definition)};`)
      .join('\n  ')}\n}`;
  } else {
    return ';';
  }
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

function render(root: Record<string, Schema>): string {
  return (
    Object.entries(root)
      .map(([name, schema]) => renderTopLevelType(name, schema))
      .join('\n') + '\n'
  );
}

export default render;
