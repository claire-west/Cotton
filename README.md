# COTN

**C**oncise **O**bject **T**ransfer **N**otation is a derivative of common seralization formats such as JSON and TOML with the main goal of eliminating the repetition of keys for objects that appear multiple times within a payload.

## Overview

Object structures are declared as ordered **key sets**. Each key set has an identifier that includes the characters `[a-zA-Z]` as well as a comma-separated list of keys surrounded by parentheses.

```
MyStruct(foo,bar,baz)
```

This key set can be applied to an object by leading the opening brace of the object with the key set's identifier.
This is not mandatory, so the same object can be expressed in either of the following ways:

```
<Explicit properties in any order>
{
    foo: "val1",
    bar: +,
    baz: 5
}

<Ordered properties using key set>
MyStruct{ "val1", +, 5 }
```

Similarly, uniform arrays of objects can include a key set identifier indicating that all elements of the array follow the structure denoted by the key set.

```
MyStruct[
    { +, 5, "val1" }
    { +, !, "val2" }
    { -, 10, "tes3" }
]
```

## Syntax

The start of a file may be a bare version number. This is not required, but is supported without needing a version number to be explicitly part of the payload data. The version number is defined as any sequence of numbers and dots prior to the first alphabetic character or opening bracket, so long as it is preceded by a "v" character to distinguish it from a file containing a single number as its payload.

White space outside of strings is always ignored. No rules about line or file endings exist.

Commas are optional when listing objects or arrays, but mandatory when listing keys, values, or key-value pairs. Comma-dangle is allowed and ignored.

The only characters that need to be escaped are double quotes `\"` and backslashes `\\` within strings.

Comments are any text surrounded by double angle brackets/chevrons (`<<` and `>>`). All comments are block comments.

### Types of Tokens

**Keys** are bare strings, with no surrounding quotes. In a key set, keys are comma-separated and surrounded in parentheses. In an explicit object, keys precede their associated value and are followed by a colon (`:`).

**Key sets** are denoted by an `[a-zA-Z]+` prefix followed by a pair of parentheses (`(` and `)`) which surround a comma-separated list of keys. Key sets are always declared at the top level of the payload and before the body.

**Values** refer to any string, number, boolean, null, object, or array. In the case of objects and arrays, this means that some values can contain their own keys and/or values. Values are separated by commas (`,`).

**Strings** are surrounded in double quotes, following the same rules as for JSON.

**Numbers** are bare, uninterrupted numeric values following the same rules as for JSON.

**Boolean** values are expressed as the bare symbols `+` for true and `-` for false.

**null** values may be expressed with a bare exclamation mark (`!`). In an object defined by a key set, the symbol can be omitted and two (or more) consecutive commas (`,,`) implicitly results in a null value for that position.

**Objects** are sets of key-value pairs surrounded by curly braces (`{` and `}`). The pairs may be comma-separated, but this is only mandatory for numbers, booleans, and null values to distinguish them from the start of the following key. The opening brace may be prefixed by a key set identifier, in which case the contents of the braces are an ordered, comma-separated list of values matching the order of keys in the key set.

**Arrays** are lists of values surrounded by square brackets (`[` and `]`). If the opening bracket is prefixed by a key set identifier, the array is assumed to be a uniform list of objects matching that structure.

### File Structure

A COTN file includes

- 0-1 version number
- 0-* key sets
- 1 value (which may or may not contain additional nested values)

Listed below are a variety of examples of valid COTN files. It will become rapidly apparent that named key sets are sometimes almost *more* verbose than if you simply list the keys in the object. For this reason, named key sets are primarily used for arrays of objects.

```
MyStruct(bar, baz, foo)
MyStruct{ +, 5, "val1" }
```

```
<this is a comment>
{
    foo: "val1",
    bar: +,
    baz: 5
}
```

```
v1.0
MyStruct(foo,bar,baz)
MyStruct[
    { "val1", +, 5 }
    { "val2", +, ! }
    { "tes3", -, 10 }
]
```

```
v1.1
MyStruct(bar,baz,foo)
{
    name: "barbazfoo",
    values: MyStruct[
        { +, 5, "val1" }
        { +, !, "val2" }
        { -, 10, "tes3" }
    ]
}
```

```
MyStruct(bar,baz,foo)
[
    MyStruct{ +, 5, "val1" }
    MyStruct{ +, !, "val2" }
    MyStruct{ -, 10, "tes3" }
]
```

```
v2.0
[
    {
        foo: "val1",
        bar: +,
        baz: 5,
    }
    { foo: "val2", bar: +, baz: !, }
]
```

```
56
```

```
v1....0000.01 <a strange version number, but technically valid>
56
```

```
"foo"
```

## Implementation

### JavaScript

The "js" folder of this repository includes a reference implementation for parsing ~~and serialization~~. This is a work-in-progress and is subject to change. Currently, the reference implementation includes some behaviors not defined in the specification above, with a "laissez-faire" approach to unexpected tokens. More strict parsing may be required by a future iteration.
