// deno-lint-ignore-file prefer-const
// Copyright © 2013-2017 David Caldwell <david@porkrind.org>
// Copyright © 2025 Quinn Shanahan
//
// Permission to use, copy, modify, and/or distribute this software for unknown
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR unknown
// SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR unknown DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
// OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
// CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
//
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

// deno-lint-ignore no-explicit-any
type replacerFunc = (this: any, key: string, value: any) => any

/**
 * Type describing the configuration options for renderJson.
 */
interface RenderJsonOptions {
	show: string
	hide: string
	showToLevel: number
	maxStringLength: number
	sortObjects: boolean
	replacer?: replacerFunc
	collapseMsg: (length: number) => string
	propertyList?: (string)[]
}

/**
 * The main function signature, plus the attached configuration methods.
 */
interface RenderJsonFunction {
	(json: unknown): HTMLPreElement

	setIcons(show: string | Node, hide: string | Node): RenderJsonFunction
	setShowToLevel(level: number | string): RenderJsonFunction
	setMaxStringLength(length: number | string): RenderJsonFunction
	setSortObjects(sortBool: boolean): RenderJsonFunction
	setReplacer(
		replacer: replacerFunc | undefined,
	): RenderJsonFunction
	setCollapseMsg(fn: (length: number) => string): RenderJsonFunction
	setPropertyList(propList: (string | number)[] | undefined): RenderJsonFunction
	setShowByDefault(show: boolean): RenderJsonFunction

	options: Partial<RenderJsonOptions> // We'll populate defaults below
}

/**
 * Creates text nodes wrapped in spans for syntax highlighting, etc.
 * Usage: themeText('class', 'text', 'class', 'text', ...)
 */
function themeText(...args: Array<string | null>): Node[] {
	const spans: Node[] = []
	while (args.length) {
		const className = args.shift()
		const txt = args.shift()
		if (txt != null) {
			spans.push(appendEl(createSpan(className || ''), textNode(txt)))
		}
	}
	return spans
}

/** Appends children (including arrays) to a DOM element. */
function appendEl(el: HTMLElement, ...children: unknown[]): HTMLElement {
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (Array.isArray(child)) {
			appendEl(el, ...child)
		} else if (child instanceof Node) {
			el.appendChild(child)
		}
	}
	return el
}

/** Prepends a single child to a DOM element. */
function prependEl(el: Node, child: Node): Node {
	if (el.firstChild) {
		el.insertBefore(child, el.firstChild)
	} else {
		el.appendChild(child)
	}
	return el
}

/** Checks if an object is effectively empty (no own properties). */
function isEmpty(obj: object, propList?: (string | number)[]): boolean {
	const keys = propList || Object.keys(obj)
	for (let i = 0; i < keys.length; i++) {
		if (Object.hasOwnProperty.call(obj, keys[i])) {
			return false
		}
	}
	return true
}

/** Creates a text node. */
function textNode(txt: string): Text {
	return document.createTextNode(txt)
}

/** Creates a <span> with an optional class name. */
function createSpan(className: string): HTMLSpanElement {
	const s = document.createElement('span')
	if (className) {
		s.className = className
	}
	return s
}

/** Creates an <a> element with a click callback and optional class. */
function createAnchor(
	txt: Node | string,
	className: string | null,
	callback: () => void,
): HTMLAnchorElement {
	const a = document.createElement('a')
	if (className) a.className = className
	if (typeof txt === 'string') {
		a.appendChild(textNode(txt))
	} else {
		a.appendChild(txt.cloneNode(true))
	}
	a.href = '#'
	a.onclick = function (e) {
		callback()
		if (e) e.stopPropagation()
		return false
	}
	return a
}

/**
 * Recursively renders JSON as DOM elements.
 */
function renderJsonInternal(
	json: unknown,
	indent: string,
	dontIndent: boolean,
	showLevel: number,
	options: RenderJsonOptions,
): Node[] {
	if (json instanceof Node) {
		return [json]
	}
	const myIndent = dontIndent ? '' : indent

	function createDisclosure(
		open: string,
		placeholder: string,
		close: string,
		type: string,
		builder: () => HTMLElement,
	): HTMLElement {
		let content: HTMLElement | undefined
		const empty = createSpan(type)

		function show(): void {
			if (!content) {
				appendEl(
					empty.parentNode as HTMLElement,
					(content = prependEl(
						builder(),
						createAnchor(options.hide, 'disclosure', function () {
							if (content) {
								content.style.display = 'none'
							}
							empty.style.display = 'inline'
						}),
					) as HTMLElement),
				)
			}
			if (content) {
				content.style.display = 'inline'
			}
			empty.style.display = 'none'
		}

		appendEl(
			empty,
			createAnchor(options.show, 'disclosure', show),
			themeText(type + ' syntax', open),
			createAnchor(placeholder, null, show),
			themeText(type + ' syntax', close),
		)

		const el = appendEl(createSpan(''), textNode(myIndent.slice(0, -1)), empty)

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
		return [
			createDisclosure(
				'"',
				json.slice(0, options.maxStringLength) + ' ...',
				'"',
				'string',
				function () {
					return appendEl(
						createSpan('string'),
						themeText(null, myIndent, 'string', JSON.stringify(json)),
					)
				},
			),
		]
	}

	// Primitive values (string, number, boolean, date)
	if (
		typeof json !== 'object' ||
		json instanceof Number ||
		json instanceof String ||
		json instanceof Boolean ||
		json instanceof Date
	) {
		return themeText(null, myIndent, typeof json, JSON.stringify(json))
	}

	// Arrays
	if (Array.isArray(json)) {
		if (json.length === 0) {
			return themeText(null, myIndent, 'array syntax', '[]')
		}
		return [
			createDisclosure(
				'[',
				options.collapseMsg(json.length),
				']',
				'array',
				() => {
					const as = appendEl(
						createSpan('array'),
						themeText('array syntax', '[', null, '\n'),
					)
					for (let i = 0; i < json.length; i++) {
						appendEl(
							as,
							renderJsonInternal(
								options.replacer
									? options.replacer.call(json, i as unknown as string, json[i])
									: json[i],
								indent + '    ',
								false,
								showLevel - 1,
								options,
							),
							i !== json.length - 1 ? themeText('syntax', ',') : [],
							textNode('\n'),
						)
					}
					appendEl(as, themeText(null, indent, 'array syntax', ']'))
					return as
				},
			),
		]
	}

	// Objects
	if (isEmpty(json, options.propertyList)) {
		return themeText(null, myIndent, 'object syntax', '{}')
	}

	return [
		createDisclosure(
			'{',
			options.collapseMsg(Object.keys(json).length),
			'}',
			'object',
			() => {
				const os = appendEl(
					createSpan('object'),
					themeText('object syntax', '{', null, '\n'),
				)
				let keys = options.propertyList || Object.keys(json)

				if (options.sortObjects) {
					keys = keys.sort()
				}

				let lastKey: string | number | undefined
				for (const k in json) {
					lastKey = k
				}

				for (let i = 0; i < keys.length; i++) {
					const k = keys[i]
					if (!(k in json)) continue
					appendEl(
						os,
						themeText(
							null,
							indent + '    ',
							'key',
							`"${k}"`,
							'object syntax',
							': ',
						),
						renderJsonInternal(
							options.replacer
								? options.replacer.call(json, k as unknown as string, (json as Record<string, unknown>)[k])
								: (json as Record<string, unknown>)[k],
							indent + '    ',
							true,
							showLevel - 1,
							options,
						),
						k !== lastKey ? themeText('syntax', ',') : [],
						textNode('\n'),
					)
				}
				appendEl(os, themeText(null, indent, 'object syntax', '}'))
				return os
			},
		),
	]
}

/**
 * Main renderJson function. Takes a JSON value and returns an HTML <pre> element.
 */
const renderJson = function (json: unknown): HTMLPreElement {
	// Copy the defaults from the function’s own .options, applying necessary defaults
	const opts: RenderJsonOptions = {
		show: renderJson.options.show ?? '⊕',
		hide: renderJson.options.hide ?? '⊖',
		showToLevel: renderJson.options.showToLevel ?? 0,
		maxStringLength: renderJson.options.maxStringLength ?? Number.MAX_VALUE,
		sortObjects: renderJson.options.sortObjects ?? false,
		replacer: renderJson.options.replacer,
		collapseMsg:
			renderJson.options.collapseMsg ?? ((len: number) => `${len} items`),
		propertyList: renderJson.options.propertyList,
	}

	const pre = document.createElement('pre')
	// Recursively build the DOM
	const renderedNodes = renderJsonInternal(
		json,
		'',
		false,
		opts.showToLevel,
		opts,
	)

	appendEl(pre, ...renderedNodes)
	pre.className = 'renderjson'
	return pre
} as RenderJsonFunction

// Attach the config object as a property:
renderJson.options = {}

/** Attach methods for configuration. All chain back to the same function. */

renderJson.setIcons = function (show: string, hide: string) {
	renderJson.options.show = show
	renderJson.options.hide = hide
	return renderJson
}

renderJson.setShowToLevel = function (level: number | string) {
	renderJson.options.showToLevel =
		typeof level === 'string' && level.toLowerCase() === 'all'
			? Number.MAX_VALUE
			: (level as number)
	return renderJson
}

renderJson.setMaxStringLength = function (length: number | string) {
	renderJson.options.maxStringLength =
		typeof length === 'string' && length.toLowerCase() === 'none'
			? Number.MAX_VALUE
			: (length as number)
	return renderJson
}

renderJson.setSortObjects = function (sortBool: boolean) {
	renderJson.options.sortObjects = sortBool
	return renderJson
}

renderJson.setReplacer = function (
	replacer: replacerFunc,
) {
	renderJson.options.replacer = replacer
	return renderJson
}

renderJson.setCollapseMsg = function (collapseMsg: (length: number) => string) {
	renderJson.options.collapseMsg = collapseMsg
	return renderJson
}

renderJson.setPropertyList = function (
	propList: (string)[] | undefined,
) {
	renderJson.options.propertyList = propList
	return renderJson
}

// Backwards compatibility. Use setShowToLevel() for new code.
renderJson.setShowByDefault = function (show: boolean) {
	renderJson.options.showToLevel = show ? Number.MAX_VALUE : 0
	return renderJson
}

let openIcon = document.createElementNS(
	'http://www.w3.org/2000/svg',
	'svg'
)
openIcon.setAttribute('viewBox', '0 0 24 24')
openIcon.setAttribute('width', '1em')
openIcon.setAttribute('height', '1em')
openIcon.style.display = 'inline-block'
openIcon.style.fill = 'currentColor'
let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
path.setAttribute('d', 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z')
openIcon.appendChild(path)

let closeIcon = openIcon.cloneNode(true) as SVGElement
(closeIcon.querySelector('path') as SVGPathElement)
	.setAttribute('d', 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z')

// Initialize default options
renderJson
	.setIcons(closeIcon, openIcon)
	.setShowByDefault(false)
	.setSortObjects(false)
	.setMaxStringLength('none')
	.setReplacer(undefined)
	.setPropertyList(undefined)
	.setCollapseMsg((len) => len + ' item' + (len === 1 ? '' : 's'))

// Export as an ES module (TypeScript)
export { renderJson }
