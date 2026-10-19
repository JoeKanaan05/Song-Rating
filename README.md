# Song Ratings

A website for my personal song reviews, organised by album. Plain HTML, CSS
and JavaScript, with no build step. Songs come from Apple's iTunes catalog;
ratings are saved to `data/ratings.json` by a tiny local Python server.

## Run it

From the project folder:

```sh
python3 server.py        # opens http://localhost:8000 — Ctrl+C to stop
```

The server uses only Python's standard library, so there's nothing to install.
Opening `index.html` directly won't load your ratings; always go through the
server.

## Rate a song

Click **+ Add new**, search for any song, and pick it. The full album
(cover + complete tracklist) is pulled from the iTunes Search API and saved,
so unrated tracks show up too. Rate other tracks from the album or song page.

Every change is saved to `data/ratings.json` (the previous version is kept in
`data/ratings.backup.json`). **Export backup** / **Import** on the Albums page
download or restore a copy of that file.

## Structure

```
.
├── index.html          Home: stats, recently rated albums, top-rated songs
├── albums.html         All albums: search, genre filter, sort
├── album.html          One album + full tracklist (album.html?id=<album-id>)
├── song.html           One song (song.html?album=<album-id>&track=<number>)
├── add.html            Search the catalog and rate a song
├── about.html          About you and your rating scale
├── server.py           Local server: serves the site + saves ratings
├── data/
│   └── ratings.json    ← your albums and ratings (created on first save)
├── css/
│   ├── base.css        Colours/tokens, reset, typography
│   ├── layout.css      Header, footer, page grids, responsive breakpoints
│   └── components.css  Cards, badges, covers, tracklist, detail pages
├── js/
│   ├── store.js        Loads/saves ratings via the server, export/import
│   ├── api.js          iTunes Search API: song search + album lookup
│   ├── utils.js        Helpers: album stats, sorting, formatting, URLs
│   ├── components.js   Shared header/footer + card/row/badge renderers
│   └── pages/
│       ├── home.js
│       ├── albums.js
│       ├── album.js
│       ├── song.js
│       └── add.js
└── assets/
    └── favicon.svg
```

Scripts load in this order on every page: `store.js` → (`api.js` on the add
page) → `utils.js` → `components.js` → the page script.
