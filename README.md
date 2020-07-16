Generate HTML forms and bind hierarchical and tabular data with the help of [JSON Schema](https://json-schema.org).

Form-Chen supports master-detail relationships and undo/redo transaction management.

It uses [grid-chen](https://github.com/decatur/grid-chen) to produce Excel-like web-components for
tabular (aka table/grid/matrix) data. 

Edits on the original object are emitted as standard [JSON Patch](https://tools.ietf.org/html/rfc6902),
which can be directly passed to the back end.

Optionally, object properties can be specified by [JSON Pointers](https://tools.ietf.org/html/rfc6901) to be bound to given HTML-elements.

Form-Chen is written in plain EcmaScript 2017 modules and can be directly imported as such with any modern browser.

# Usage

![usage](usage.png)

```html
<div class="form-chen">
    <!-- JSON Path to root element -->
    <div id="/person"></div>
    <!-- JSON Path to root vip property -->
    <span style="font-size: x-large" id="/person/vip"></span>
</div>
```

```javascript
    import {createFormChen} from "./webcomponentwebcomponent.js"

    const schema = {
        title: 'Person',
        pathPrefix: '/person',
        type: 'object',
        properties: {
            name: {
                title: 'Full Name of Person', type: 'string'
            },
            dateOfBirth: {
                title: 'Date of Birth', type: 'string', format: 'full-date'
            },
            vip: {
                type: 'boolean'
            }
        }
    };

    const data = {
        name: 'Frida Krum',
        dateOfBirth: '2019-01-01T00:00Z',
        vip: true
    };

    createFormChen(schema, data);
```

# Demos

See https://decatur.github.io/form-chen

# Read Only

At any level, the schema can be marked `readOnly:true|false`, the default value being `false`.
The `readOnly` property is inherited by sub-schemas. 

# DOM Api and CSS Styling

The form is generated as a flat list of paired elements. The input elements are generated with the document ID corresponding to the JSON Pointer to its value.

Pairs           | Semantic
----------------|-----------
&lt;label/&gt; &lt;input&gt;     | For all scalar fields
&lt;label/&gt; &lt;select&gt;    | For all scalar fields having an enum type
&lt;label/&gt; &lt;checkbox&gt;  | For all scalar boolean fields
&lt;label&gt; &lt;grid-chen/&gt; &lt;/label&gt;| For all grid fields
&lt;label class=error/&gt;                   | For errors

In case a field has a unit, then the label will have a nested &lt;span class=unit/&gt; element.

No direct element style is applied.

Based on this flat list of paired elements, the layout can be tweaked using CSS Column Layout, CSS Grid Layout or CSS Flex Layout, or whatever. See the demos for examples.

# JavaScript Api

Please see the source code of the demos or [form-chen TypeScript Definitions](formchen/formchen.d.ts) for the public JavaScript Api.

# Development

Form-Chen is written in plain EcmaScript 2017 modules with JSDocs type hinting.
There is no overhead related to transpiling or packing.
As tool I recommend either vscode or one of the JetBrains IDEs (WebStorm, PyCharm).
