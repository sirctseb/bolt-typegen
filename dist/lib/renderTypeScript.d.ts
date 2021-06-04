import SimpleBoltSchema, { TopLevelType, TypeProperty } from './SimpleBoltSchema';
declare function render(simpleBoltSchema: SimpleBoltSchema): string;
declare namespace render {
    var interfaceOpen: (type: TopLevelType) => string;
    var propertyLine: (property: TypeProperty) => string;
}
export default render;
