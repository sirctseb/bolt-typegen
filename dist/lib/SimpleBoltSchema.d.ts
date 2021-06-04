import { ExpGenericType, ExpSimpleType, ExpType, ExpUnionType, Schema } from 'firebase-bolt/lib/ast';
export declare const isSimpleType: (type: ExpType) => type is ExpSimpleType;
export declare const isGenericType: (type: ExpType) => type is ExpGenericType;
export declare const isUnionType: (type: ExpType) => type is ExpUnionType;
export declare class TypeProperty {
    name: string;
    definition: ExpType;
    params?: ExpType[];
    types?: ExpType[];
    constructor(name: string, typeDefinition: ExpType);
}
export declare class TopLevelType {
    name: string;
    definition: Schema;
    parent?: string;
    params?: string[];
    properties: TypeProperty[];
    constructor(name: string, typeDefinition: Schema);
}
declare class SimpleBoltSchema {
    types: TopLevelType[];
    constructor(boltSchema: {
        [key: string]: Schema;
    });
}
export default SimpleBoltSchema;
