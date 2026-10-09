# Hao Yu's homepage

## Update publications

Edit [publications.bib](publications.bib) and add a BibTeX entry. Use
`@inproceedings` for a conference paper or `@article` for a journal paper.
Each entry needs `title`, `author`, `year`, and `booktitle` or `journal`.
Separate authors with `and`. The page sorts papers by year, updates the
conference and journal counts, and bolds `Hao Yu` or `Yu, Hao` automatically.

Optional fields: `shortvenue` (the venue label), `corresponding` (author names
separated by `and`), `url`, `doi`, `pdf`, and `code`.

```bibtex
@article{yu2027example,
  title = {Example Paper},
  author = {Jane Doe and Yu, Hao},
  journal = {Example Journal},
  year = {2027},
  shortvenue = {EJ},
  doi = {10.0000/example}
}
```

To preview locally, run `node preview.js` from this folder and open
<http://127.0.0.1:8000/>. Stop the server with Ctrl+C. The BibTeX loader needs
an HTTP server; opening `index.html` directly as a file will not load the list.

Run `node --test tests/publications.test.js` to check the bibliography parser.
