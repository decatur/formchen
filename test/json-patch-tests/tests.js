/**
 * Credits: This module is based on the JSON test cases in 
 * https://github.com/json-patch/json-patch-tests/blob/86ad182cbc2ba0c4ed0f539753a283c6c9755f21/tests.json
 * 
 * Tests with invalid JavaScript syntax (duplicate object properties).
 * The comment field was set whenever it was missing.
 */

export const testCases = [
  {
    "comment": "empty list, empty docs",
    "doc": {},
    "patch": [],
    "expected": {}
  },

  {
    "comment": "empty patch list",
    "doc": { "foo": 1 },
    "patch": [],
    "expected": { "foo": 1 }
  },

  {
    "comment": "rearrangements OK?",
    "doc": { "foo": 1, "bar": 2 },
    "patch": [],
    "expected": { "bar": 2, "foo": 1 }
  },

  {
    "comment": "rearrangements OK?  How about one level down ... array",
    "doc": [{ "foo": 1, "bar": 2 }],
    "patch": [],
    "expected": [{ "bar": 2, "foo": 1 }]
  },

  {
    "comment": "rearrangements OK?  How about one level down...",
    "doc": { "foo": { "foo": 1, "bar": 2 } },
    "patch": [],
    "expected": { "foo": { "bar": 2, "foo": 1 } }
  },

  {
    "comment": "add replaces any existing field",
    "doc": { "foo": null },
    "patch": [{ "op": "add", "path": "/foo", "value": 1 }],
    "expected": { "foo": 1 }
  },

  {
    "comment": "toplevel array",
    "doc": [],
    "patch": [{ "op": "add", "path": "/0", "value": "foo" }],
    "expected": ["foo"]
  },

  {
    "comment": "toplevel array, no change",
    "doc": ["foo"],
    "patch": [],
    "expected": ["foo"]
  },

  {
    "comment": "toplevel object, numeric string",
    "doc": {},
    "patch": [{ "op": "add", "path": "/foo", "value": "1" }],
    "expected": { "foo": "1" }
  },

  {
    "comment": "toplevel object, integer",
    "doc": {},
    "patch": [{ "op": "add", "path": "/foo", "value": 1 }],
    "expected": { "foo": 1 }
  },

  {
    "comment": "Toplevel scalar values OK?",
    "doc": "foo",
    "patch": [{ "op": "replace", "path": "", "value": "bar" }],
    "expected": "bar",
    "disabled": true
  },

  {
    "comment": "replace object document with array document?",
    "doc": {},
    "patch": [{ "op": "add", "path": "", "value": [] }],
    "expected": []
  },

  {
    "comment": "replace array document with object document?",
    "doc": [],
    "patch": [{ "op": "add", "path": "", "value": {} }],
    "expected": {}
  },

  {
    "comment": "append to root array document?",
    "doc": [],
    "patch": [{ "op": "add", "path": "/-", "value": "hi" }],
    "expected": ["hi"]
  },

  {
    "comment": "Add, / target",
    "doc": {},
    "patch": [{ "op": "add", "path": "/", "value": 1 }],
    "expected": { "": 1 }
  },

  {
    "comment": "Add, /foo/ deep target (trailing slash)",
    "doc": { "foo": {} },
    "patch": [{ "op": "add", "path": "/foo/", "value": 1 }],
    "expected": { "foo": { "": 1 } }
  },

  {
    "comment": "Add composite value at top level",
    "doc": { "foo": 1 },
    "patch": [{ "op": "add", "path": "/bar", "value": [1, 2] }],
    "expected": { "foo": 1, "bar": [1, 2] }
  },

  {
    "comment": "Add into composite value",
    "doc": { "foo": 1, "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "add", "path": "/baz/0/foo", "value": "world" }],
    "expected": { "foo": 1, "baz": [{ "qux": "hello", "foo": "world" }] }
  },

  {
    "comment": "Out of bounds (upper)",
    "doc": { "bar": [1, 2] },
    "patch": [{ "op": "add", "path": "/bar/8", "value": "5" }],
    "error": "index 8 is greater than max value 2"
  },

  {
    "comment": "Out of bounds (lower)",
    "doc": { "bar": [1, 2] },
    "patch": [{ "op": "add", "path": "/bar/-1", "value": "5" }],
    "error": 'Invalid array index "-1"'
  },

  {
    "comment": "?",
    "doc": { "foo": 1 },
    "patch": [{ "op": "add", "path": "/bar", "value": true }],
    "expected": { "foo": 1, "bar": true }
  },

  {
    "comment": "??",
    "doc": { "foo": 1 },
    "patch": [{ "op": "add", "path": "/bar", "value": false }],
    "expected": { "foo": 1, "bar": false }
  },

  {
    "comment": "???",
    "doc": { "foo": 1 },
    "patch": [{ "op": "add", "path": "/bar", "value": null }],
    "expected": { "foo": 1, "bar": null }
  },

  {
    "comment": "0 can be an array index or object element name",
    "doc": { "foo": 1 },
    "patch": [{ "op": "add", "path": "/0", "value": "bar" }],
    "expected": { "foo": 1, "0": "bar" }
  },

  {
    "comment": "????",
    "doc": ["foo"],
    "patch": [{ "op": "add", "path": "/1", "value": "bar" }],
    "expected": ["foo", "bar"]
  },

  {
    "comment": "?????",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/1", "value": "bar" }],
    "expected": ["foo", "bar", "sil"]
  },

  {
    "comment": "?A",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/0", "value": "bar" }],
    "expected": ["bar", "foo", "sil"]
  },

  {
    "comment": "push item to array via last index + 1",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/2", "value": "bar" }],
    "expected": ["foo", "sil", "bar"]
  },

  {
    "comment": "add item to array at index > length should fail",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/3", "value": "bar" }],
    "error": "index 3 is greater than max value 2"
  },

  {
    "comment": "test against implementation-specific numeric parsing",
    "doc": { "1e0": "foo" },
    "patch": [{ "op": "test", "path": "/1e0", "value": "foo" }],
    "expected": { "1e0": "foo" }
  },

  {
    "comment": "test with bad number should fail",
    "doc": ["foo", "bar"],
    "patch": [{ "op": "test", "path": "/1e0", "value": "bar" }],
    "error": "test op shouldn't get array element 1"
  },

  {
    "comment": "?B",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/bar", "value": 42 }],
    "error": 'Invalid array index "bar"'
  },

  {
    "comment": "value in array add not flattened",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/1", "value": ["bar", "baz"] }],
    "expected": ["foo", ["bar", "baz"], "sil"],
  },

  {
    "comment": "?C",
    "doc": { "foo": 1, "bar": [1, 2, 3, 4] },
    "patch": [{ "op": "remove", "path": "/bar" }],
    "expected": { "foo": 1 }
  },

  {
    "comment": "?D",
    "doc": { "foo": 1, "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "remove", "path": "/baz/0/qux" }],
    "expected": { "foo": 1, "baz": [{}] }
  },

  {
    "comment": "?E",
    "doc": { "foo": 1, "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "replace", "path": "/foo", "value": [1, 2, 3, 4] }],
    "expected": { "foo": [1, 2, 3, 4], "baz": [{ "qux": "hello" }] }
  },

  {
    "comment": "?F",
    "doc": { "foo": [1, 2, 3, 4], "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "replace", "path": "/baz/0/qux", "value": "world" }],
    "expected": { "foo": [1, 2, 3, 4], "baz": [{ "qux": "world" }] }
  },

  {
    "comment": "?G",
    "doc": ["foo"],
    "patch": [{ "op": "replace", "path": "/0", "value": "bar" }],
    "expected": ["bar"]
  },

  {
    "comment": "?G",
    "doc": [""],
    "patch": [{ "op": "replace", "path": "/0", "value": 0 }],
    "expected": [0]
  },

  {
    "doc": [""],
    "patch": [{ "op": "replace", "path": "/0", "value": true }],
    "expected": [true]
  },

  {
    "doc": [""],
    "patch": [{ "op": "replace", "path": "/0", "value": false }],
    "expected": [false]
  },

  {
    "doc": [""],
    "patch": [{ "op": "replace", "path": "/0", "value": null }],
    "expected": [null]
  },

  {
    "doc": ["foo", "sil"],
    "patch": [{ "op": "replace", "path": "/1", "value": ["bar", "baz"] }],
    "expected": ["foo", ["bar", "baz"]],
    "comment": "value in array replace not flattened"
  },

  {
    "comment": "replace whole document",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "replace", "path": "", "value": { "baz": "qux" } }],
    "expected": { "baz": "qux" }
  },

  {
    "comment": "test replace with missing parent key should fail",
    "doc": { "bar": "baz" },
    "patch": [{ "op": "replace", "path": "/foo/bar", "value": false }],
    "error": 'path "/foo" does not exist'
  },

  {
    "comment": "spurious patch properties",
    "doc": { "foo": 1 },
    "patch": [{ "op": "test", "path": "/foo", "value": 1, "spurious": 1 }],
    "expected": { "foo": 1 }
  },

  {
    "doc": { "foo": null },
    "patch": [{ "op": "test", "path": "/foo", "value": null }],
    "expected": { "foo": null },
    "comment": "null value should be valid obj property"
  },

  {
    "doc": { "foo": null },
    "patch": [{ "op": "replace", "path": "/foo", "value": "truthy" }],
    "expected": { "foo": "truthy" },
    "comment": "null value should be valid obj property to be replaced with something truthy"
  },

  {
    "doc": { "foo": null },
    "patch": [{ "op": "move", "from": "/foo", "path": "/bar" }],
    "expected": { "bar": null },
    "comment": "null value should be valid obj property to be moved"
  },

  {
    "doc": { "foo": null },
    "patch": [{ "op": "copy", "from": "/foo", "path": "/bar" }],
    "expected": { "foo": null, "bar": null },
    "comment": "null value should be valid obj property to be copied"
  },

  {
    "comment": "null value should be valid obj property to be removed",
    "doc": { "foo": null },
    "patch": [{ "op": "remove", "path": "/foo" }],
    "expected": {}
  },

  {
    "comment": "null value should still be valid obj property replace other value",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "replace", "path": "/foo", "value": null }],
    "expected": { "foo": null }
  },

  {
    "comment": "test should pass despite rearrangement",
    "doc": { "foo": { "foo": 1, "bar": 2 } },
    "patch": [{ "op": "test", "path": "/foo", "value": { "bar": 2, "foo": 1 } }],
    "expected": { "foo": { "foo": 1, "bar": 2 } }
  },

  {
    "comment": "test should pass despite (nested) rearrangement",
    "doc": { "foo": [{ "foo": 1, "bar": 2 }] },
    "patch": [{ "op": "test", "path": "/foo", "value": [{ "bar": 2, "foo": 1 }] }],
    "expected": { "foo": [{ "foo": 1, "bar": 2 }] }
  },

  {
    "comment": "test should pass - no error",
    "doc": { "foo": { "bar": [1, 2, 5, 4] } },
    "patch": [{ "op": "test", "path": "/foo", "value": { "bar": [1, 2, 5, 4] } }],
    "expected": { "foo": { "bar": [1, 2, 5, 4] } }

  },

  {
    "comment": "?X",
    "doc": { "foo": { "bar": [1, 2, 5, 4] } },
    "patch": [{ "op": "test", "path": "/foo", "value": [1, 2] }],
    "error": "test op should fail"
  },

  {
    "comment": "Whole document",
    "doc": { "foo": 1 },
    "patch": [{ "op": "test", "path": "", "value": { "foo": 1 } }],
    "disabled": true
  },

  {
    "comment": "Empty-string element",
    "doc": { "": 1 },
    "patch": [{ "op": "test", "path": "/", "value": 1 }],
    "expected": { "": 1 }
  },

  {
    "doc": {
      "foo": ["bar", "baz"],
      "": 0,
      "a/b": 1,
      "c%d": 2,
      "e^f": 3,
      "g|h": 4,
      "i\\j": 5,
      "k\"l": 6,
      " ": 7,
      "m~n": 8
    },
    "patch": [{ "op": "test", "path": "/foo", "value": ["bar", "baz"] },
    { "op": "test", "path": "/foo/0", "value": "bar" },
    { "op": "test", "path": "/", "value": 0 },
    { "op": "test", "path": "/a~1b", "value": 1 },
    { "op": "test", "path": "/c%d", "value": 2 },
    { "op": "test", "path": "/e^f", "value": 3 },
    { "op": "test", "path": "/g|h", "value": 4 },
    { "op": "test", "path": "/i\\j", "value": 5 },
    { "op": "test", "path": "/k\"l", "value": 6 },
    { "op": "test", "path": "/ ", "value": 7 },
    { "op": "test", "path": "/m~0n", "value": 8 }],
    "expected": {
      "": 0,
      " ": 7,
      "a/b": 1,
      "c%d": 2,
      "e^f": 3,
      "foo": [
        "bar",
        "baz"
      ],
      "g|h": 4,
      "i\\j": 5,
      "k\"l": 6,
      "m~n": 8
    }
  },
  {
    "comment": "Move to same location has no effect",
    "doc": { "foo": 1 },
    "patch": [{ "op": "move", "from": "/foo", "path": "/foo" }],
    "expected": { "foo": 1 }
  },

  {
    "comment": "",
    "doc": { "foo": 1, "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "move", "from": "/foo", "path": "/bar" }],
    "expected": { "baz": [{ "qux": "hello" }], "bar": 1 }
  },

  {
    "comment": "",
    "doc": { "baz": [{ "qux": "hello" }], "bar": 1 },
    "patch": [{ "op": "move", "from": "/baz/0/qux", "path": "/baz/1" }],
    "expected": { "baz": [{}, "hello"], "bar": 1 }
  },

  {
    "comment": "",
    "doc": { "baz": [{ "qux": "hello" }], "bar": 1 },
    "patch": [{ "op": "copy", "from": "/baz/0", "path": "/boo" }],
    "expected": { "baz": [{ "qux": "hello" }], "bar": 1, "boo": { "qux": "hello" } }
  },

  {
    "comment": "replacing the root of the document is possible with add",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "add", "path": "", "value": { "baz": "qux" } }],
    "expected": { "baz": "qux" }
  },

  {
    "comment": "Adding to \"/-\" adds to the end of the array",
    "doc": [1, 2],
    "patch": [{ "op": "add", "path": "/-", "value": { "foo": ["bar", "baz"] } }],
    "expected": [1, 2, { "foo": ["bar", "baz"] }]
  },

  {
    "comment": "Adding to \"/-\" adds to the end of the array, even n levels down",
    "doc": [1, 2, [3, [4, 5]]],
    "patch": [{ "op": "add", "path": "/2/1/-", "value": { "foo": ["bar", "baz"] } }],
    "expected": [1, 2, [3, [4, 5, { "foo": ["bar", "baz"] }]]]
  },

  {
    "comment": "test remove with bad number should fail",
    "doc": { "foo": 1, "baz": [{ "qux": "hello" }] },
    "patch": [{ "op": "remove", "path": "/baz/1e0/qux" }],
    "error": 'path "/baz/1e0" does not exist'
  },

  {
    "comment": "test remove on array",
    "doc": [1, 2, 3, 4],
    "patch": [{ "op": "remove", "path": "/0" }],
    "expected": [2, 3, 4]
  },

  {
    "comment": "test repeated removes",
    "doc": [1, 2, 3, 4],
    "patch": [{ "op": "remove", "path": "/1" },
    { "op": "remove", "path": "/2" }],
    "expected": [1, 3]
  },

  {
    "comment": "test remove with bad index should fail",
    "doc": [1, 2, 3, 4],
    "patch": [{ "op": "remove", "path": "/1e0" }],
    "error": 'Invalid array index "1e0"'
  },

  {
    "comment": "test replace with bad number should fail",
    "doc": [""],
    "patch": [{ "op": "replace", "path": "/1e0", "value": false }],
    "error": 'Invalid array index "1e0"'
  },

  {
    "comment": "test copy with bad number should fail",
    "doc": { "baz": [1, 2, 3], "bar": 1 },
    "patch": [{ "op": "copy", "from": "/baz/1e0", "path": "/boo" }],
    "error": "copy op shouldn't work with bad number"
  },

  {
    "comment": "test move with bad number should fail",
    "doc": { "foo": 1, "baz": [1, 2, 3, 4] },
    "patch": [{ "op": "move", "from": "/baz/1e0", "path": "/foo" }],
    "error": "move op shouldn't work with bad number"
  },

  {
    "comment": "test add with bad number should fail",
    "doc": ["foo", "sil"],
    "patch": [{ "op": "add", "path": "/1e0", "value": "bar" }],
    "error": 'Invalid array index "1e0"'
  },

  {
    "comment": "missing path parameter",
    "doc": {},
    "patch": [{ "op": "add", "value": "bar" }],
    "error": "missing path parameter"
  },

  {
    "comment": "'path' parameter with null value",
    "doc": {},
    "patch": [{ "op": "add", "path": null, "value": "bar" }],
    "error": 'invalid path parameter "null"'
  },

  {
    "comment": "invalid JSON Pointer token",
    "doc": {},
    "patch": [{ "op": "add", "path": "foo", "value": "bar" }],
    "error": "path should start with a slash: foo"
  },

  {
    "comment": "missing 'value' parameter to add",
    "doc": [1],
    "patch": [{ "op": "add", "path": "/-" }],
    "error": "missing 'value' parameter"
  },

  {
    "comment": "missing 'value' parameter to replace",
    "doc": [1],
    "patch": [{ "op": "replace", "path": "/0" }],
    "error": "missing 'value' parameter"
  },

  {
    "comment": "missing 'value' parameter to test",
    "doc": [null],
    "patch": [{ "op": "test", "path": "/0" }],
    "error": "missing 'value' parameter"
  },

  {
    "comment": "missing value parameter to test - where undef is falsy",
    "doc": [false],
    "patch": [{ "op": "test", "path": "/0" }],
    "error": "missing 'value' parameter"
  },

  {
    "comment": "missing from parameter to copy",
    "doc": [1],
    "patch": [{ "op": "copy", "path": "/-" }],
    "error": "missing 'from' parameter"
  },

  {
    "comment": "missing from location to copy",
    "doc": { "foo": 1 },
    "patch": [{ "op": "copy", "from": "/bar", "path": "/foo" }],
    "error": "missing 'from' location"
  },

  {
    "comment": "missing from parameter to move",
    "doc": { "foo": 1 },
    "patch": [{ "op": "move", "path": "" }],
    "error": "missing 'from' parameter"
  },

  {
    "comment": "missing from location to move",
    "doc": { "foo": 1 },
    "patch": [{ "op": "move", "from": "/bar", "path": "/foo" }],
    "error": "missing 'from' location"
  },

  {
    "comment": "unrecognized op should fail",
    "doc": { "foo": 1 },
    "patch": [{ "op": "spam", "path": "/foo", "value": 1 }],
    "error": "Unrecognized op 'spam'"
  },

  {
    "comment": "test with bad array number that has leading zeros",
    "doc": ["foo", "bar"],
    "patch": [{ "op": "test", "path": "/00", "value": "foo" }],
    "error": "test op should reject the array value, it has leading zeros"
  },

  {
    "comment": "test with bad array number that has leading zeros",
    "doc": ["foo", "bar"],
    "patch": [{ "op": "test", "path": "/01", "value": "bar" }],
    "error": "test op should reject the array value, it has leading zeros"
  },

  {
    "comment": "Removing nonexistent field",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "remove", "path": "/baz" }],
    "error": 'path "/baz" does not exist'
  },

  {
    "comment": "Removing deep nonexistent path",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "remove", "path": "/missing1/missing2" }],
    "error": 'path "/missing1" does not exist'
  },

  {
    "comment": "Removing nonexistent index",
    "doc": ["foo", "bar"],
    "patch": [{ "op": "remove", "path": "/2" }],
    "error": "index 2 is greater than max value 1"
  },

  {
    "comment": "Patch with different capitalisation than doc",
    "doc": { "foo": "bar" },
    "patch": [{ "op": "add", "path": "/FOO", "value": "BAR" }],
    "expected": { "foo": "bar", "FOO": "BAR" }
  }

]
