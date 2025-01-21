// Copyright © 2013-2017 David Caldwell <david@porkrind.org>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
// SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
// OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
// CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

// Usage
// -----
// The module exports one entry point, the `renderJson()` function. It takes in
// the JSON you want to render as a single argument and returns an HTML
// element.
//
// Options
// -------
// renderJson.setIcons("+", "-")
//   Allows you to override the disclosure icons.
//
// renderJson.setShowToLevel(level)
//   Pass the number of levels to expand when rendering. The default is 0, which
//   starts with everything collapsed. As a special case, if level is the string
//   "all" then it will start with everything expanded.
//
// renderJson.setMaxStringLength(length)
//   Strings will be truncated and made expandable if they are longer than
//   `length`. As a special case, if `length` is the string "none" then
//   there will be no truncation. The default is "none".
//
// renderJson.setSortObjects(sortBool)
//   Sort objects by key (default: false)
//
// renderJson.setReplacer(replacerFunction)
//   Equivalent of JSON.stringify() `replacer` argument when it's a function
//
// renderJson.setCollapseMsg(collapseFunction)
//   Accepts a function (len:number):string => {} where len is the length of the
//   object collapsed. The function should return the message displayed when an
//   object is collapsed. The default message is "X items"
//
// renderJson.setPropertyList(propertyList)
//   Equivalent of JSON.stringify() `replacer` argument when it's an array
//
// Theming
// -------
// The HTML output uses a number of classes so that you can theme it the way
// you'd like:
//     .disclosure    ("⊕", "⊖")
//     .syntax        (",", ":", "{", "}", "[", "]")
//     .string        (includes quotes)
//     .number
//     .boolean
//     .key           (object key)
//     .keyword       ("null", "undefined")
//     .object.syntax ("{", "}")
//     .array.syntax  ("[", "]")

function themeText(...args) {
	// usage: themeText('class', 'text', 'class', 'text', ...)
	let spans = []
	while (args.length) {
		const className = args.shift()
		const txt = args.shift()
		spans.push(appendEl(createSpan(className), textNode(txt)))
	}
	return spans
}

function appendEl(el, ...children) {
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (Array.isArray(child)) {
			appendEl(el, ...child)
		} else {
			el.appendChild(child)
		}
	}
	return el
}

function prependEl(el, child) {
	el.insertBefore(child, el.firstChild)
	return el
}

function isEmpty(obj, propList) {
	let keys = propList || Object.keys(obj)
	for (let i = 0; i < keys.length; i++) {
		if (Object.hasOwnProperty.call(obj, keys[i])) {
			return false
		}
	}
	return true
}

function textNode(txt) {
	return document.createTextNode(txt)
}

function createSpan(className) {
	let s = document.createElement('span')
	if (className) {
		s.className = className
	}
	return s
}

function createAnchor(txt, className, callback) {
	let a = document.createElement('a')
	if (className) a.className = className
	a.appendChild(textNode(txt))
	a.href = '#'
	a.onclick = function (e) {
		callback()
		if (e) e.stopPropagation()
		return false
	}
	return a
}

function renderJsonInternal(json, indent, dontIndent, showLevel, options) {
	let myIndent = dontIndent ? '' : indent

	function createDisclosure(open, placeholder, close, type, builder) {
		let content
		let empty = createSpan(type)

		function show() {
			if (!content) {
				appendEl(
					empty.parentNode,
					(content = prependEl(
						builder(),
						createAnchor(options.hide, 'disclosure', function () {
							content.style.display = 'none'
							empty.style.display = 'inline'
						})
					))
				)
			}
			content.style.display = 'inline'
			empty.style.display = 'none'
		}

		appendEl(
			empty,
			createAnchor(options.show, 'disclosure', show),
			themeText(type + ' syntax', open),
			createAnchor(placeholder, null, show),
			themeText(type + ' syntax', close)
		)

		let el = appendEl(createSpan(), textNode(myIndent.slice(0, -1)), empty)

		// Automatically expand if showLevel > 0 (but not for strings).
		if (showLevel > 0 && type !== 'string') {
			show()
		}
		return el
	}

	// Handle null & undefined
	if (json === null) {
		return themeText(null, myIndent, 'keyword', 'null')
	}
	if (json === void 0) {
		return themeText(null, myIndent, 'keyword', 'undefined')
	}

	// Truncated strings
	if (typeof json === 'string' && json.length > options.maxStringLength) {
		return createDisclosure(
			'"',
			json.slice(0, options.maxStringLength) + ' ...',
			'"',
			'string',
			function () {
				return appendEl(
					createSpan('string'),
					themeText(null, myIndent, 'string', JSON.stringify(json))
				)
			}
		)
	}

	// Primitive values (string, number, boolean, date)
	if (
		typeof json !== 'object' ||
		[Number, String, Boolean, Date].indexOf(json.constructor) >= 0
	) {
		return themeText(null, myIndent, typeof json, JSON.stringify(json))
	}

	// Arrays
	if (json.constructor === Array) {
		if (json.length === 0) {
			return themeText(null, myIndent, 'array syntax', '[]')
		}
		return createDisclosure(
			'[',
			options.collapseMsg(json.length),
			']',
			'array',
			function () {
				let as = appendEl(
					createSpan('array'),
					themeText('array syntax', '[', null, '\n')
				)
				for (let i = 0; i < json.length; i++) {
					appendEl(
						as,
						renderJsonInternal(
							options.replacer.call(json, i, json[i]),
							indent + '    ',
							false,
							showLevel - 1,
							options
						),
						i !== json.length - 1 ? themeText('syntax', ',') : [],
						textNode('\n')
					)
				}
				appendEl(as, themeText(null, indent, 'array syntax', ']'))
				return as
			}
		)
	}

	// Objects
	if (isEmpty(json, options.propertyList)) {
		return themeText(null, myIndent, 'object syntax', '{}')
	}

	return createDisclosure(
		'{',
		options.collapseMsg(Object.keys(json).length),
		'}',
		'object',
		function () {
			let os = appendEl(
				createSpan('object'),
				themeText('object syntax', '{', null, '\n')
			)
			let keys = options.propertyList || Object.keys(json)

			if (options.sortObjects) {
				keys = keys.sort()
			}

			let lastKey
			for (let k in json) {
				lastKey = k
			}

			for (let i = 0; i < keys.length; i++) {
				let k = keys[i]
				if (!(k in json)) continue
				appendEl(
					os,
					themeText(
						null,
						indent + '    ',
						'key',
						`"${k}"`,
						'object syntax',
						': '
					),
					renderJsonInternal(
						options.replacer.call(json, k, json[k]),
						indent + '    ',
						true,
						showLevel - 1,
						options
					),
					k != lastKey ? themeText('syntax', ',') : [],
					textNode('\n')
				)
			}
			appendEl(os, themeText(null, indent, 'object syntax', '}'))
			return os
		}
	)
}

// Main renderJson function
let renderJson = function (json) {
	let opts = Object.assign({}, renderJson.options)
	// If not a function, default to identity
	opts.replacer =
		typeof opts.replacer === 'function' ? opts.replacer : (k, v) => v

	let pre = appendEl(
		document.createElement('pre'),
		renderJsonInternal(json, '', false, opts.showToLevel, opts)
	)
	pre.className = 'renderjson'
	return pre
}

// Attach methods for configuration
renderJson.setIcons = function (show, hide) {
	renderJson.options.show = show
	renderJson.options.hide = hide
	return renderJson
}

renderJson.setShowToLevel = function (level) {
	renderJson.options.showToLevel =
		typeof level === 'string' && level.toLowerCase() === 'all'
			? Number.MAX_VALUE
			: level
	return renderJson
}

renderJson.setMaxStringLength = function (length) {
	renderJson.options.maxStringLength =
		typeof length === 'string' && length.toLowerCase() === 'none'
			? Number.MAX_VALUE
			: length
	return renderJson
}

renderJson.setSortObjects = function (sortBool) {
	renderJson.options.sortObjects = sortBool
	return renderJson
}

renderJson.setReplacer = function (replacer) {
	renderJson.options.replacer = replacer
	return renderJson
}

renderJson.setCollapseMsg = function (collapseMsg) {
	renderJson.options.collapseMsg = collapseMsg
	return renderJson
}

renderJson.setPropertyList = function (propList) {
	renderJson.options.propertyList = propList
	return renderJson
}

// Backwards compatibility. Use setShowToLevel() for new code.
renderJson.setShowByDefault = function (show) {
	renderJson.options.showToLevel = show ? Number.MAX_VALUE : 0
	return renderJson
}

// Default options
renderJson.options = {}
renderJson
	.setIcons('⊕', '⊖')
	.setShowByDefault(false)
	.setSortObjects(false)
	.setMaxStringLength('none')
	.setReplacer(undefined)
	.setPropertyList(undefined)
	.setCollapseMsg(function (len) {
		return len + ' item' + (len === 1 ? '' : 's')
	})

// Export as an ES module
export { renderJson }
