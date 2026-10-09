(function () {
  "use strict";

  function parseBibtex(source) {
    var cursor = 0;
    var entries = [];
    var macros = {};

    function skipSpace() {
      while (cursor < source.length) {
        if (/\s/.test(source[cursor])) cursor++;
        else if (source[cursor] === "%") {
          while (cursor < source.length && source[cursor] !== "\n") cursor++;
        } else break;
      }
    }

    function identifier() {
      var start = cursor;
      while (cursor < source.length && /[\w:-]/.test(source[cursor])) cursor++;
      return source.slice(start, cursor);
    }

    function braced() {
      var start = ++cursor;
      var depth = 1;
      while (cursor < source.length && depth) {
        if (source[cursor] === "\\") cursor += 2;
        else if (source[cursor] === "{") { depth++; cursor++; }
        else if (source[cursor] === "}") { depth--; cursor++; }
        else cursor++;
      }
      if (depth) throw new Error("Unclosed BibTeX value near character " + start);
      return source.slice(start, cursor - 1);
    }

    function quoted() {
      var start = ++cursor;
      while (cursor < source.length) {
        if (source[cursor] === "\\") cursor += 2;
        else if (source[cursor++] === '"') return source.slice(start, cursor - 1);
      }
      throw new Error("Unclosed quoted BibTeX value near character " + start);
    }

    function value(end) {
      var parts = [];
      do {
        skipSpace();
        var part;
        if (source[cursor] === "{") part = braced();
        else if (source[cursor] === '"') part = quoted();
        else {
          var start = cursor;
          while (cursor < source.length && ![",", "#", end].includes(source[cursor])) cursor++;
          part = source.slice(start, cursor).trim();
          part = macros[part.toLowerCase()] || part;
        }
        parts.push(part);
        skipSpace();
        if (source[cursor] !== "#") break;
        cursor++;
      } while (true);
      return parts.join("");
    }

    function skipBlock(open, end) {
      var depth = 1;
      while (cursor < source.length && depth) {
        if (source[cursor] === "\\") cursor += 2;
        else if (source[cursor] === open) { depth++; cursor++; }
        else if (source[cursor] === end) { depth--; cursor++; }
        else cursor++;
      }
      if (depth) throw new Error("Unclosed BibTeX block");
    }

    while (cursor < source.length) {
      skipSpace();
      if (source[cursor] !== "@") { cursor++; continue; }
      cursor++;
      skipSpace();
      var type = identifier().toLowerCase();
      skipSpace();
      var open = source[cursor++];
      var end = open === "{" ? "}" : open === "(" ? ")" : null;
      if (!type || !end) throw new Error("Invalid BibTeX entry near character " + cursor);
      if (type === "comment" || type === "preamble") { skipBlock(open, end); continue; }

      skipSpace();
      var key = "";
      if (type !== "string") {
        var keyStart = cursor;
        while (cursor < source.length && source[cursor] !== "," && source[cursor] !== end) cursor++;
        key = source.slice(keyStart, cursor).trim();
        if (!key) throw new Error("BibTeX entry is missing a citation key");
        if (source[cursor] === ",") cursor++;
      }

      var fields = {};
      var closed = false;
      while (cursor < source.length) {
        skipSpace();
        if (source[cursor] === ",") { cursor++; continue; }
        if (source[cursor] === end) { cursor++; closed = true; break; }
        var name = identifier().toLowerCase();
        skipSpace();
        if (!name || source[cursor++] !== "=") {
          throw new Error("Invalid BibTeX field in " + (key || "@string"));
        }
        fields[name] = value(end);
      }
      if (!closed) throw new Error("Unclosed BibTeX entry " + key);
      if (type === "string") Object.assign(macros, fields);
      else entries.push({ type: type, key: key, fields: fields });
    }
    return entries;
  }

  function displayText(value) {
    var accents = { "'": "\u0301", "`": "\u0300", '"': "\u0308", "^": "\u0302", "~": "\u0303" };
    return String(value || "")
      .replace(/\\textsuperscript\s*\{([^{}]*)\}/g, function (_, text) { return text === "2" ? "²" : text; })
      .replace(/\\(?:emph|textit|textbf)\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(['`"^~])\s*\{?([A-Za-z])\}?/g, function (_, mark, letter) {
        return (letter + accents[mark]).normalize("NFC");
      })
      .replace(/\\([&%_$#{}])/g, "$1")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitAuthors(value) {
    var authors = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < value.length; i++) {
      if (value[i] === "{" && value[i - 1] !== "\\") depth++;
      else if (value[i] === "}" && value[i - 1] !== "\\") depth--;
      else if (depth === 0 && /^\s+and\s+/i.test(value.slice(i))) {
        var separator = value.slice(i).match(/^\s+and\s+/i)[0];
        authors.push(value.slice(start, i));
        i += separator.length - 1;
        start = i + 1;
      }
    }
    authors.push(value.slice(start));
    return authors.map(function (author) {
      var name = displayText(author);
      var parts = name.split(/,\s*/);
      return parts.length === 2 ? parts[1] + " " + parts[0] : name;
    }).filter(Boolean);
  }

  function isHaoYu(name) {
    return /^(hao yu|yu hao|于灏)$/.test(name.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim());
  }

  function groupPublications(entries) {
    var groups = { conference: [], journal: [], other: [] };
    entries.forEach(function (entry, index) {
      var fields = entry.fields;
      if (!fields.title || !fields.author || !fields.year) {
        throw new Error("Missing title, author, or year in " + entry.key);
      }
      var group = entry.type === "article" ? "journal" :
        /^(inproceedings|conference|proceedings)$/.test(entry.type) ? "conference" : "other";
      groups[group].push({ key: entry.key, fields: fields, index: index });
    });
    Object.keys(groups).forEach(function (group) {
      groups[group].sort(function (a, b) {
        return (parseInt(b.fields.year, 10) || 0) - (parseInt(a.fields.year, 10) || 0) || a.index - b.index;
      });
    });
    return groups;
  }

  function element(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function appendLinks(card, fields) {
    var links = [];
    [["Paper", fields.url], ["DOI", fields.doi && (/^https?:\/\//i.test(fields.doi) ? fields.doi : "https://doi.org/" + fields.doi)],
      ["PDF", fields.pdf], ["Code", fields.code]].forEach(function (item) {
      var url = (item[1] || "").trim();
      if (/^https?:\/\//i.test(url) || /^(?!\/|\.\.\/)[\w./-]+$/i.test(url)) links.push([item[0], url]);
    });
    if (!links.length) return;
    var row = element("p", "publication__links");
    links.forEach(function (item) {
      var link = element("a", "", item[0]);
      link.href = item[1];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.appendChild(link);
    });
    card.appendChild(row);
  }

  function createCard(publication) {
    var fields = publication.fields;
    var card = element("article", "publication");
    card.setAttribute("itemscope", "");
    card.setAttribute("itemtype", "https://schema.org/ScholarlyArticle");
    var top = element("div", "publication__top");
    var title = element("h3", "publication__title", displayText(fields.title));
    title.setAttribute("itemprop", "headline");
    top.appendChild(title);
    top.appendChild(element("span", "publication__year", displayText(fields.year)));
    card.appendChild(top);

    var authors = element("p", "publication__authors");
    authors.setAttribute("itemprop", "author");
    var authorNames = splitAuthors(fields.author);
    var corresponding = splitAuthors(fields.corresponding || "").map(function (name) { return name.toLowerCase(); });
    authorNames.forEach(function (name, index) {
      if (index) authors.appendChild(document.createTextNode(index === authorNames.length - 1 ?
        (authorNames.length === 2 ? " and " : ", and ") : ", "));
      authors.appendChild(element(isHaoYu(name) ? "strong" : "span", "", name));
      if (corresponding.includes(name.toLowerCase())) authors.appendChild(element("sup", "", "*"));
    });
    card.appendChild(authors);

    var venueName = displayText(fields.journal || fields.booktitle || fields.school || "");
    var venue = element("p", "publication__venue", venueName);
    if (fields.shortvenue) {
      venue.appendChild(document.createTextNode(" ("));
      venue.appendChild(element("b", "", displayText(fields.shortvenue)));
      venue.appendChild(document.createTextNode(")"));
    }
    card.appendChild(venue);
    appendLinks(card, fields);
    return card;
  }

  function renderPublications(root, entries) {
    var mount = root.querySelector("[data-publications]");
    if (!mount) return;
    var groups = groupPublications(entries);
    mount.replaceChildren();
    [["conference", "Conference papers"], ["journal", "Journal papers"], ["other", "Other publications"]]
      .forEach(function (group) {
        var papers = groups[group[0]];
        if (!papers.length) return;
        var section = element("section", "publication-section");
        var heading = element("div", "publication-section__heading");
        heading.appendChild(element("h2", "", group[1]));
        heading.appendChild(element("span", "publication-section__count",
          papers.length + (papers.length === 1 ? " paper" : " papers")));
        section.appendChild(heading);
        var list = element("div", "publication-list");
        papers.forEach(function (paper) { list.appendChild(createCard(paper)); });
        section.appendChild(list);
        mount.appendChild(section);
      });
  }

  function loadPublications(root) {
    var page = root && root.classList && root.classList.contains("publications-page") ? root :
      (root || document).querySelector(".publications-page");
    if (!page) return Promise.resolve();
    var mount = page.querySelector("[data-publications]");
    return fetch(new URL("publications.bib", document.baseURI), { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (text) { renderPublications(page, parseBibtex(text)); })
      .catch(function (error) {
        console.error("Could not load publications.bib:", error);
        if (mount) mount.replaceChildren(element("p", "publication-status",
          "Could not load publications. Please refresh the page or check publications.bib."));
      });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseBibtex: parseBibtex, displayText: displayText,
      splitAuthors: splitAuthors, isHaoYu: isHaoYu, groupPublications: groupPublications };
  }
  if (typeof document !== "undefined") {
    window.loadPublications = loadPublications;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { loadPublications(document); });
    else loadPublications(document);
  }
}());
