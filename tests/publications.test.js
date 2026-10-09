const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  parseBibtex,
  displayText,
  splitAuthors,
  isHaoYu,
  groupPublications
} = require('../assets/js/publications.js');

test('the migrated bibliography has every existing paper and category', () => {
  const bib = fs.readFileSync(path.join(__dirname, '..', 'publications.bib'), 'utf8');
  const entries = parseBibtex(bib);
  const groups = groupPublications(entries);
  assert.equal(entries.length, 25);
  assert.equal(groups.conference.length, 11);
  assert.equal(groups.journal.length, 14);
  assert.equal(entries.filter(entry => entry.fields.corresponding).length, 1);
  assert.ok(entries.every(entry => splitAuthors(entry.fields.author).some(isHaoYu)));
});

test('common BibTeX syntax and author name order are supported', () => {
  const bib = `
    @string{venue = "Example Conference"}
    @comment{ignore this @article{fake, title={Wrong}}}
    @inproceedings{sample,
      title = {Robust {Graph} Learning},
      author = "Yu, Hao and Jane Doe",
      booktitle = venue,
      year = 2027
    }
  `;
  const entries = parseBibtex(bib);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].fields.booktitle, 'Example Conference');
  assert.equal(displayText(entries[0].fields.title), 'Robust Graph Learning');
  assert.deepEqual(splitAuthors(entries[0].fields.author), ['Hao Yu', 'Jane Doe']);
  assert.ok(isHaoYu(splitAuthors(entries[0].fields.author)[0]));
});

test('malformed BibTeX is reported instead of silently losing entries', () => {
  assert.throws(() => parseBibtex('@article{broken, title={Missing close}'), /Unclosed BibTeX entry/);
});
