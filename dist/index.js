"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTypes = void 0;
const firebase_bolt_1 = require("firebase-bolt");
const SimpleBoltSchema_1 = require("./lib/SimpleBoltSchema");
const renderTypeScript_1 = require("./lib/renderTypeScript");
const generateTypes = (boltString) => {
    const parsed = firebase_bolt_1.parse(boltString);
    const schema = new SimpleBoltSchema_1.default(parsed.schema);
    return renderTypeScript_1.default(schema);
};
exports.generateTypes = generateTypes;
