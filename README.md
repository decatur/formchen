Generate HTML forms and bind hierarchical data with the help of [JSON Schema](https://json-schema.org). 

Uses [grid-chen](https://github.com/decatur/grid-chen) to produce Excel-like web-components for matrix-like data. 

Object attributes can be specified by [JSON Pointers](https://tools.ietf.org/html/rfc6901) to be bound to given HTML-elements.

The diff between the edited and the original object can be retrieved as a [JSON Patch](https://tools.ietf.org/html/rfc6902).

# Usage

Also see usage.html.

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

# Box Model and CSS Styling

The form is generated as a flat list of paired elements 

Pairs           | Semantic
----------------|-----------
&lt;label/&gt; &lt;input&gt;     | For all scalar fields
&lt;label/&gt; &lt;select&gt;    | For all scalar fields having an enum type
&lt;label/&gt; &lt;checkbox&gt;  | For all scalar boolean fields
&lt;label&gt; &lt;grid-chen/&gt; &lt;/label&gt;| For all grid fields
&lt;label class=error/&gt;                   | For errors

In case a field has a unit, then the label will have a nested &lt;span class=unit/&gt; element.

No direct element style is applied.

Based on this box model, the layout can be tweaked using CSS Column Layout, CSS Grid Layout or CSS Flex Layout.
See the demos for examples.

# API

Please see the source code of the demos or [form-chen TypeScript Definitions](./form-chen/formchen.d.ts)