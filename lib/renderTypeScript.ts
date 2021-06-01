import { ExpGenericType, ExpType } from 'firebase-bolt/lib/ast';
import _ from 'lodash';
import SimpleBoltSchema, {
  TopLevelType,
  TypeProperty,
  isGenericType,
  isUnionType,
  isSimpleType,
} from './SimpleBoltSchema';

// Private: Mappings from some Bolt built-in types to their TypeScript equivalents
const BOLT_BUILTIN_MAPPING: Record<string, string> = {
  Any: 'any',
  Boolean: 'boolean',
  Number: 'number',
  Null: 'void',
  Object: 'Object',
  String: 'string',
};

// | string?
function convertBuiltin(builtin: string): string {
  return BOLT_BUILTIN_MAPPING[builtin] || builtin;
}

function ts(type: ExpType | string): string {
  if (typeof type === 'string') {
    return convertBuiltin(type);
  }

  if (isUnionType(type)) {
    throw new Error('Cannot generate a typescript expression for a union type here');
  }

  let str = convertBuiltin(type.name);

  if (isGenericType(type) && type.params && type.params.length > 0) {
    str += '<';
    str += type.params.map(ts).join(', ');
    str += '>';
  }
  return str;
}

function tse(type: TopLevelType | ExpType): string {
  if (typeof type === 'string') {
    return convertBuiltin(type);
  }

  if (!(type instanceof TopLevelType) && isUnionType(type)) {
    throw new Error('Cannot generate a typescript expression for a union type here');
  }

  let str = type.name;

  if ((type instanceof TopLevelType || isGenericType(type)) && type.params && type.params.length > 0) {
    str += '<';
    str += type.params.map(ts).join(', ');
    str += '>';
  }
  return str;
}

// Private:
function unionPropertyLine(name: string, types: ExpType[]): string {
  const isNullable = types.some((type) => !isUnionType(type) && type.name === 'Null');
  const tsTypes = types.filter((type) => isUnionType(type) || type.name !== 'Null');

  let str = '';
  str += name;
  str += isNullable ? '?' : '';
  str += ': ';
  str += tsTypes.map(ts).join(' | ');
  str += ';';
  return str;
}

function mapPropertyLine(name: string, typeDefiniton: ExpGenericType): string {
  // TODO support union types in maps
  const mappedType = typeDefiniton.params[1];
  if (isUnionType(mappedType)) {
    throw new Error('Maps to union types are not currently supported');
  }
  return `${name}: { [key: string]: ${convertBuiltin(mappedType.name)}; };`;
}

function genericPropertyLine(name: string, typeDef: ExpGenericType): string {
  switch (typeDef.name) {
    case 'Map':
      return mapPropertyLine(name, typeDef);
    default:
      return `${name}: ${ts(typeDef)};`;
  }
}

function propertyLine(property: TypeProperty): string {
  const name = property.name;
  const typeDef = property.definition;

  if (isSimpleType(typeDef)) {
    return `${name}: ${convertBuiltin(typeDef.name)};`;
  } else if (isUnionType(typeDef)) {
    return unionPropertyLine(name, typeDef.types);
  } else {
    //if (isGenericType(typeDef)) {
    return genericPropertyLine(name, typeDef);
  }
}

// type - TopLevelType
//
// Returns the extension part of a TypeScript interface definition.
// e.g. the ` extends String` in `interface UserID extends String`
//
// Note this will return `extends Any` for any Bolt defintion without any
// defined parent or properties.
function interfaceExtension(type: TopLevelType): string {
  if (type.parent !== 'Object') {
    if (type.parent !== 'Any' || (type.parent === 'Any' && type.properties !== [])) {
      return ` extends ${tse(type.definition.derivedFrom)}`;
    }
    return '';
  }
  return '';
}

// type - TopLevelType
function interfaceOpen(type: TopLevelType): string {
  let str = '';
  str += 'interface ';
  str += tse(type);
  str += interfaceExtension(type);
  str += ' {';
  return str;
}

// simpleBoltSchema - SimpleBoltSchema
function render(simpleBoltSchema: SimpleBoltSchema): string {
  let str = '';
  simpleBoltSchema.types.forEach((type) => {
    str += interfaceOpen(type);
    str += '\n';
    type.properties.forEach((property) => {
      str += '  ';
      str += propertyLine(property);
      str += '\n';
    });
    str += '}\n';
  });
  return str;
}

render.interfaceOpen = interfaceOpen;
render.propertyLine = propertyLine;

export default render;
