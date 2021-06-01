import { ExpGenericType, ExpSimpleType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
import _ from 'lodash';

export const isSimpleType = (type: ExpType): type is ExpSimpleType => type.type === 'type';
export const isGenericType = (type: ExpType): type is ExpGenericType => type.type === 'generic';
export const isUnionType = (type: ExpType): type is ExpUnionType => type.type === 'union';

export class TypeProperty {
  name: string;
  definition: ExpType;
  params?: ExpType[];
  types?: ExpType[];

  constructor(name: string, typeDefinition: ExpType) {
    this.name = name;
    this.definition = typeDefinition;
    if (isGenericType(typeDefinition)) {
      this.params = typeDefinition.params;
    }
    if (isUnionType(typeDefinition)) {
      this.types = typeDefinition.types;
    }
  }
}

export class TopLevelType {
  name: string;
  definition: Schema;
  parent?: string;
  params?: string[];
  properties: TypeProperty[];

  constructor(name: string, typeDefinition: Schema) {
    this.name = name;
    this.definition = typeDefinition;
    if (!isUnionType(typeDefinition.derivedFrom)) {
      this.parent = typeDefinition.derivedFrom.name;
    }
    this.params = typeDefinition.params;
    this.properties = _.map(typeDefinition.properties, (typeDef: ExpType, propName: string) => {
      return new TypeProperty(propName, typeDef);
    });
  }
}

class SimpleBoltSchema {
  types: TopLevelType[];
  // boltSchema - schema produced by `bolt#parse`
  constructor(boltSchema: { [key: string]: Schema }) {
    this.types = _.map(boltSchema, (typeDef, typeName) => {
      return new TopLevelType(typeName, typeDef);
    });
  }
}

export default SimpleBoltSchema;
