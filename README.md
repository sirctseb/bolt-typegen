# Bolt Type Generator :zap:

[![Build Status](https://app.travis-ci.com/sirctseb/bolt-typegen.svg?branch=main)](https://app.travis-ci.com/sirctseb/bolt-typegen)

Generate TypesScript types from types declared in Bolt security rules.

This tool is useful if you use [Bolt Compiler](https://github.com/FirebaseExtended/bolt) to author your security rules and you use typescript to write client code.

Consider some trivial security rules like:

```bolt
path / is ToySchema {
  read() { true }
}

type ToySchema {
  stringChild: String;
  nullableChild: Number | Null;
}
```

You can use this tool to generate types that reflect what the rules enforce:

```ts
export interface ToySchema {
  stringChild: string;
  nullableChild?: number;
}
```

Then you can use the emitted types to gain static typing of the values retrieved from firebase:

```ts
firebase.database().ref('/').once('value').then(snapshot => {
  // 🎉
  const x: ToySchema = snapshot.val();
})
```

## Features

### Preference for interface declarations with type declaration fallback

Bolt type definitions are translated to interface declarations whenever possible, and type declarations otherwise, such as when the type extends a native type or a Map (which are rendered as `Record`s). It is possible to declare interfaces that extend `Record`s, for example, when `string` is passed as the key type argument, but we do not detect and emit interface declarations for those cases yet.

```bolt
type NativeExtension extends String {}
type ObjectExtension {
  child: String;
}
```

```ts
export type NativeExtension = String;
export interface ObjectExtension {
  child: string;
}
```

### Optional properties

In the Firebase realtime database, a field cannot hold null as a value. Assigning null to a field removes the field from the object entirely. Therefore, given a bolt type like:

```bolt
type MyObject {
  nonNullableField: String;
  nullableField: String | Null;
}
```

a naive translation to `nullableField: string | null;` is incorrect, and we make the property optional instead:

```ts
export interface MyObject {
  nonNullableField: string;
  nullableField?: string;
}
```

Fields in the realtime database also cannot hold an empty object as a value. When all the fields on an object are assigned null (are deleted), the field that held the object is also removed entirely. Consider the type:

```bolt
type MyObject {
  nullableField: String | null;
}

type MyOtherObject {
  myObject: MyObject;
}
```

The field `myObject` does not explicitly include `Null` in a union like in the first example, but the field must still be optional because if `nullableField` is set to null, the value would be an empty object, and the `myObject` field is removed.

See the [basic nullable](samples/basic-nullable.bolt), [implicit nullability](samples/implicit-nullability.bolt), and [implicity nullability via type params](samples/implicit-nullability-via-type-param.bolt) tests for more cases and examples.

## Usage

```ts
    import { generateTypes } from 'bolt-typegen';

    generateTypes('type Person { name: String }')
    // => 'export interface Person { name: string; }'
```
