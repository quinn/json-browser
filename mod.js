function themeText(...args) {
  const spans = [];
  while (args.length) {
    const className = args.shift();
    const txt = args.shift();
    if (txt != null) {
      spans.push(appendEl(createSpan(className || ""), textNode(txt)));
    }
  }
  return spans;
}
function appendEl(el, ...children) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (Array.isArray(child)) {
      appendEl(el, ...child);
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  return el;
}
function prependEl(el, child) {
  if (el.firstChild) {
    el.insertBefore(child, el.firstChild);
  } else {
    el.appendChild(child);
  }
  return el;
}
function isEmpty(obj, propList) {
  const keys = propList || Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (Object.hasOwnProperty.call(obj, keys[i])) {
      return false;
    }
  }
  return true;
}
function textNode(txt) {
  return document.createTextNode(txt);
}
function createSpan(className) {
  const s = document.createElement("span");
  if (className) {
    s.className = className;
  }
  return s;
}
function createAnchor(txt, className, callback) {
  const a = document.createElement("a");
  if (className) a.className = className;
  if (typeof txt === "string") {
    a.appendChild(textNode(txt));
  } else {
    a.appendChild(txt.cloneNode(true));
  }
  a.href = "#";
  a.onclick = function(e) {
    callback();
    if (e) e.stopPropagation();
    return false;
  };
  return a;
}
function renderJsonInternal(json, indent, dontIndent, showLevel, options) {
  if (json instanceof Node) {
    return [json];
  }
  const myIndent = dontIndent ? "" : indent;
  function createDisclosure(open, placeholder, close, type, builder) {
    let content;
    const empty = createSpan(type);
    function show() {
      if (!content) {
        appendEl(
          empty.parentNode,
          content = prependEl(
            builder(),
            createAnchor(options.hide, "disclosure", function() {
              if (content) {
                content.style.display = "none";
              }
              empty.style.display = "inline";
            })
          )
        );
      }
      if (content) {
        content.style.display = "inline";
      }
      empty.style.display = "none";
    }
    appendEl(
      empty,
      createAnchor(options.show, "disclosure", show),
      themeText(type + " syntax", open),
      createAnchor(placeholder, null, show),
      themeText(type + " syntax", close)
    );
    const el = appendEl(createSpan(""), textNode(myIndent.slice(0, -1)), empty);
    if (showLevel > 0 && type !== "string") {
      show();
    }
    return el;
  }
  if (json === null) {
    return themeText(null, myIndent, "keyword", "null");
  }
  if (json === void 0) {
    return themeText(null, myIndent, "keyword", "undefined");
  }
  if (typeof json === "string" && json.length > options.maxStringLength) {
    return [
      createDisclosure(
        '"',
        json.slice(0, options.maxStringLength) + " ...",
        '"',
        "string",
        function() {
          return appendEl(
            createSpan("string"),
            themeText(null, myIndent, "string", JSON.stringify(json))
          );
        }
      )
    ];
  }
  if (typeof json !== "object" || json instanceof Number || json instanceof String || json instanceof Boolean || json instanceof Date) {
    return themeText(null, myIndent, typeof json, JSON.stringify(json));
  }
  if (Array.isArray(json)) {
    if (json.length === 0) {
      return themeText(null, myIndent, "array syntax", "[]");
    }
    return [
      createDisclosure(
        "[",
        options.collapseMsg(json.length),
        "]",
        "array",
        () => {
          const as = appendEl(
            createSpan("array"),
            themeText("array syntax", "[", null, "\n")
          );
          for (let i = 0; i < json.length; i++) {
            appendEl(
              as,
              renderJsonInternal(
                options.replacer ? options.replacer.call(json, i, json[i]) : json[i],
                indent + "    ",
                false,
                showLevel - 1,
                options
              ),
              i !== json.length - 1 ? themeText("syntax", ",") : [],
              textNode("\n")
            );
          }
          appendEl(as, themeText(null, indent, "array syntax", "]"));
          return as;
        }
      )
    ];
  }
  if (isEmpty(json, options.propertyList)) {
    return themeText(null, myIndent, "object syntax", "{}");
  }
  return [
    createDisclosure(
      "{",
      options.collapseMsg(Object.keys(json).length),
      "}",
      "object",
      () => {
        const os = appendEl(
          createSpan("object"),
          themeText("object syntax", "{", null, "\n")
        );
        let keys = options.propertyList || Object.keys(json);
        if (options.sortObjects) {
          keys = keys.sort();
        }
        let lastKey;
        for (const k in json) {
          lastKey = k;
        }
        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          if (!(k in json)) continue;
          appendEl(
            os,
            themeText(
              null,
              indent + "    ",
              "key",
              `"${k}"`,
              "object syntax",
              ": "
            ),
            renderJsonInternal(
              options.replacer ? options.replacer.call(json, k, json[k]) : json[k],
              indent + "    ",
              true,
              showLevel - 1,
              options
            ),
            k !== lastKey ? themeText("syntax", ",") : [],
            textNode("\n")
          );
        }
        appendEl(os, themeText(null, indent, "object syntax", "}"));
        return os;
      }
    )
  ];
}
const renderJson = function(json) {
  const opts = {
    show: renderJson.options.show ?? "\u2295",
    hide: renderJson.options.hide ?? "\u2296",
    showToLevel: renderJson.options.showToLevel ?? 0,
    maxStringLength: renderJson.options.maxStringLength ?? Number.MAX_VALUE,
    sortObjects: renderJson.options.sortObjects ?? false,
    replacer: renderJson.options.replacer,
    collapseMsg: renderJson.options.collapseMsg ?? ((len) => `${len} items`),
    propertyList: renderJson.options.propertyList
  };
  const pre = document.createElement("pre");
  const renderedNodes = renderJsonInternal(
    json,
    "",
    false,
    opts.showToLevel,
    opts
  );
  appendEl(pre, ...renderedNodes);
  pre.className = "renderjson";
  return pre;
};
renderJson.options = {};
renderJson.setIcons = function(show, hide) {
  renderJson.options.show = show;
  renderJson.options.hide = hide;
  return renderJson;
};
renderJson.setShowToLevel = function(level) {
  renderJson.options.showToLevel = typeof level === "string" && level.toLowerCase() === "all" ? Number.MAX_VALUE : level;
  return renderJson;
};
renderJson.setMaxStringLength = function(length) {
  renderJson.options.maxStringLength = typeof length === "string" && length.toLowerCase() === "none" ? Number.MAX_VALUE : length;
  return renderJson;
};
renderJson.setSortObjects = function(sortBool) {
  renderJson.options.sortObjects = sortBool;
  return renderJson;
};
renderJson.setReplacer = function(replacer) {
  renderJson.options.replacer = replacer;
  return renderJson;
};
renderJson.setCollapseMsg = function(collapseMsg) {
  renderJson.options.collapseMsg = collapseMsg;
  return renderJson;
};
renderJson.setPropertyList = function(propList) {
  renderJson.options.propertyList = propList;
  return renderJson;
};
renderJson.setShowByDefault = function(show) {
  renderJson.options.showToLevel = show ? Number.MAX_VALUE : 0;
  return renderJson;
};
let openIcon = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "svg"
);
openIcon.setAttribute("viewBox", "0 0 24 24");
openIcon.setAttribute("width", "1em");
openIcon.setAttribute("height", "1em");
openIcon.style.display = "inline-block";
openIcon.style.fill = "currentColor";
let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("d", "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z");
openIcon.appendChild(path);
let closeIcon = openIcon.cloneNode(true);
closeIcon.querySelector("path").setAttribute("d", "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z");
renderJson.setIcons(closeIcon, openIcon).setShowByDefault(false).setSortObjects(false).setMaxStringLength("none").setReplacer(void 0).setPropertyList(void 0).setCollapseMsg((len) => len + " item" + (len === 1 ? "" : "s"));
export { renderJson };
