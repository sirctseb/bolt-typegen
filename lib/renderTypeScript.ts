import { ExpGenericType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
import { isGenericType, isSimpleType } from './SimpleBoltSchema';

// Private: Mappings from some Bolt built-in types to their TypeScript equivalents
const BOLT_BUILTIN_MAPPING: Record<string, string> = {
  Any: 'any',
  Boolean: 'boolean',
  Number: 'number',
  Null: 'null',
  Object: 'Object',
  String: 'string',
};

function convertBuiltin(builtin: string): string {
  return BOLT_BUILTIN_MAPPING[builtin] || builtin;
}

const renderGenericTypeExpression = (expression: ExpGenericType): string => {
  return `${expression.name}<${expression.params.map(renderTypeExpression).join(', ')}>`;
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

const renderExtension = (schema: Schema): string => `(${renderTypeExpression(schema.derivedFrom)})`;

const renderParams = (schema: Schema): string =>
  schema.params && schema.params.length ? `<${schema.params.join(', ')}>` : '';

const renderProperties = (schema: Schema): string => {
  if (schema.properties && Object.keys(schema.properties).length) {
    return ` & {\n  ${Object.entries(schema.properties)
      .map(([name, definition]) => `${name}: ${renderTypeExpression(definition)};`)
      .join('\n  ')}\n}`;
  } else {
    return ';';
  }
};

const renderTopLevelType = (name: string, schema: Schema): string => {
  return `export type ${name}${renderParams(schema)} = ${renderExtension(schema)}${renderProperties(schema)}`;
};

function render(root: Record<string, Schema>): string {
  return Object.entries(root)
    .map(([name, schema]) => renderTopLevelType(name, schema))
    .join('\n');
}

export default render;
