Generate (and bind to data) HTML forms with the help of JSON-Schema. 
Uses https://github.com/decatur/grid-chen to produce Excel-like web-components for matrix-like data. 

# Demos

See https://decatur.github.io/form-chen

# Box Model and CSS Styling

The form is generated as a flat list of paired elements 


Pairs           | Semantic
----------------|-----------
&lt;label/&gt; &lt;input&gt;     | For all scalar fields
&lt;label/&gt; &lt;select&gt;    | For all scalar fields having an enum type
&lt;label/&gt; &lt;checkbox&gt;  | For all scalar boolean fields
&lt;label/&gt; &lt;grid-chen/&gt; | For all grid fields
&lt;label class=error/&gt;                   | For errors

In case a field has a unit, then the label will have a nested &lt;span class=unit/&gt; element.

No element style is applied with the exception to &lt;grid-chen/&gt;: The height is set to 100px;

Based on this box model, the layout can be optimized using CSS Column Layout, CSS Grid Layout or CSS Flex Layout.
See the demos for examples.