"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopLevelType = exports.TypeProperty = exports.isUnionType = exports.isGenericType = exports.isSimpleType = void 0;
const isSimpleType = (type) => type.type === 'type';
exports.isSimpleType = isSimpleType;
const isGenericType = (type) => type.type === 'generic';
exports.isGenericType = isGenericType;
const isUnionType = (type) => type.type === 'union';
exports.isUnionType = isUnionType;
class TypeProperty {
    constructor(name, typeDefinition) {
        this.name = name;
        this.definition = typeDefinition;
        if (exports.isGenericType(typeDefinition)) {
            this.params = typeDefinition.params;
        }
        if (exports.isUnionType(typeDefinition)) {
            this.types = typeDefinition.types;
        }
    }
}
exports.TypeProperty = TypeProperty;
class TopLevelType {
    constructor(name, typeDefinition) {
        this.name = name;
        this.definition = typeDefinition;
        if (!exports.isUnionType(typeDefinition.derivedFrom)) {
            this.parent = typeDefinition.derivedFrom.name;
        }
        this.params = typeDefinition.params;
        this.properties = Object.entries(typeDefinition.properties).map(([propName, typeDef]) => {
            return new TypeProperty(propName, typeDef);
        });
    }
}
exports.TopLevelType = TopLevelType;
class SimpleBoltSchema {
    // boltSchema - schema produced by `bolt#parse`
    constructor(boltSchema) {
        this.types = Object.entries(boltSchema).map(([typeName, typeDef]) => {
            return new TopLevelType(typeName, typeDef);
        });
    }
}
exports.default = SimpleBoltSchema;
