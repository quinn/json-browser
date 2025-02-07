JSON Browser
============

[![JSR](https://jsr.io/badges/@quinn/json-browser)](https://jsr.io/@quinn/json-browser)

Render JSON into collapsible, themeable HTML. This library aims to be very
simple with few options and no external dependencies. It's aimed at debugging
but you can use it wherever it is useful.

The code renders the JSON lazily, only building the HTML when the user
reveals the JSON by clicking the disclosure icons. This makes it extremely
fast to do the initial render of huge JSON objects, since the only thing
that renders initially is a single disclosure icon.


Live Example
------------

[A live example can be found here](https://quinn.github.io/json-browser/test.html).

Example
-------

```html
<div id="test"></div>
<script type="module">
    import { renderJson } from 'https://esm.sh/jsr/@quinn/json-browser@latest'

    document.getElementById("test").appendChild(
        renderJson({ hello: [1,2,3,4], there: { a:1, b:2, c:["hello", null] } })
    );
</script>
```

Usage
-----

The module exports one entry point, the `renderJson()` function. It takes in
the JSON you want to render as a single argument and returns an HTML
element.

Options
-------

There are a couple functions to call to customize the output:

```javascript
renderJson.setIcons('+', '-'); // html elements can be used as well as strings
```

Call `setIcons()` to set the disclosure icons to something other than the 
default SVG elements.

```javascript
renderJson.setShowToLevel(level);
```

Call `setShowToLevel()` to show different amounts of the JSON by
default. The default is `0`, and `1` is a popular choice. As a special case,
if `level` is the string `"all"` then all the JSON will be shown by
default. This, of course, removes the benefit of the lazy rendering, so it
may be slow with large JSON objects.

```javascript
renderJson.setMaxStringLength(length);
```

Strings will be truncated and made expandable if they are longer than
`length`. As a special case, if `length` is the string `"none"` then there
will be no truncation. The default is `"none"`.

```javascript
renderJson.setSortObjects(sortBool);
```

Sort objects by key (default: false)

```javascript
renderJson.setReplacer(replacerFunction)
renderJson.setPropertyList(propertyList)
```

These are the equivalent of the JSON.stringify() `replacer` parameter.
[Mozilla's documentation][1] has a good description of how this parameter
works. See [test.html](test.html) for an example of what these
can do.

[1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify

```javascript
renderJson.setCollapseMsg(collapse_function);
```

Accepts a function (len:number):string => {} where len is the length of the
object collapsed. Function should return the message displayed when a object
is collapsed. The default message is "X items".

These functions are chainable so you may do:

```javascript
renderJson
    .setIcons('+', '-')
    .setShowToLevel(2)
        ({ hello: [1,2,3,4], there: { a:1, b:2, c:["hello", null] } })
```

Theming
-------

The HTML output uses a number of classes so that you can theme it the way
you'd like:

    .disclosure    ("⊕", "⊖")
    .syntax        (",", ":", "{", "}", "[", "]")
    .string        (includes quotes)
    .number
    .boolean
    .key           (object key)
    .keyword       ("null", "undefined")
    .object.syntax ("{", "}")
    .array.syntax  ("[", "]")


Copyright and License
---------------------

License: [ISC](https://en.wikipedia.org/wiki/ISC_license)

Copyright © 2013-2017 David Caldwell <david@porkrind.org>

Copyright © 2025- Quinn Shanahan

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
