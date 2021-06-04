"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SimpleBoltSchema_1 = require("./SimpleBoltSchema");
// Private: Mappings from some Bolt built-in types to their TypeScript equivalents
const BOLT_BUILTIN_MAPPING = {
    Any: 'any',
    Boolean: 'boolean',
    Number: 'number',
    Null: 'void',
    Object: 'Object',
    String: 'string',
};
// | string?
function convertBuiltin(builtin) {
    return BOLT_BUILTIN_MAPPING[builtin] || builtin;
}
function ts(type) {
    if (typeof type === 'string') {
        return convertBuiltin(type);
    }
    if (SimpleBoltSchema_1.isUnionType(type)) {
        throw new Error('Cannot generate a typescript expression for a union type here');
    }
    let str = convertBuiltin(type.name);
    if (SimpleBoltSchema_1.isGenericType(type) && type.params && type.params.length > 0) {
        str += '<';
        str += type.params.map(ts).join(', ');
        str += '>';
    }
    return str;
}
function tse(type) {
    if (typeof type === 'string') {
        return convertBuiltin(type);
    }
    if (!(type instanceof SimpleBoltSchema_1.TopLevelType) && SimpleBoltSchema_1.isUnionType(type)) {
        throw new Error('Cannot generate a typescript expression for a union type here');
    }
    let str = type.name;
    if ((type instanceof SimpleBoltSchema_1.TopLevelType || SimpleBoltSchema_1.isGenericType(type)) && type.params && type.params.length > 0) {
        str += '<';
        str += type.params.map(ts).join(', ');
        str += '>';
    }
    return str;
}
// Private:
function unionPropertyLine(name, types) {
    const isNullable = types.some((type) => !SimpleBoltSchema_1.isUnionType(type) && type.name === 'Null');
    const tsTypes = types.filter((type) => SimpleBoltSchema_1.isUnionType(type) || type.name !== 'Null');
    let str = '';
    str += name;
    str += isNullable ? '?' : '';
    str += ': ';
    str += tsTypes.map(ts).join(' | ');
    str += ';';
    return str;
}
function mapPropertyLine(name, typeDefiniton) {
    // TODO support union types in maps
    const mappedType = typeDefiniton.params[1];
    if (SimpleBoltSchema_1.isUnionType(mappedType)) {
        throw new Error('Maps to union types are not currently supported');
    }
    return `${name}: { [key: string]: ${convertBuiltin(mappedType.name)}; };`;
}
function genericPropertyLine(name, typeDef) {
    switch (typeDef.name) {
        case 'Map':
            return mapPropertyLine(name, typeDef);
        default:
            return `${name}: ${ts(typeDef)};`;
    }
}
function propertyLine(property) {
    const name = property.name;
    const typeDef = property.definition;
    if (SimpleBoltSchema_1.isSimpleType(typeDef)) {
        return `${name}: ${convertBuiltin(typeDef.name)};`;
    }
    else if (SimpleBoltSchema_1.isUnionType(typeDef)) {
        return unionPropertyLine(name, typeDef.types);
    }
    else {
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
function interfaceExtension(type) {
    if (type.parent !== 'Object') {
        if (type.parent !== 'Any' || (type.parent === 'Any' && type.properties !== [])) {
            return ` extends ${tse(type.definition.derivedFrom)}`;
        }
        return '';
    }
    return '';
}
// type - TopLevelType
function interfaceOpen(type) {
    let str = '';
    str += 'interface ';
    str += tse(type);
    str += interfaceExtension(type);
    str += ' {';
    return str;
}
// simpleBoltSchema - SimpleBoltSchema
function render(simpleBoltSchema) {
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
exports.default = render;
