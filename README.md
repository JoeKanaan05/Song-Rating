# Song Ratings

A personal website for rating songs, organised by album. Search any song in
Apple's catalog, rate it out of 10, and browse your ratings by album, artist
or score.

It's plain HTML, CSS and JavaScript with no frameworks, no build step and no
backend. Ratings live in your browser. It's also a PWA, so you can install it
to your home screen and browse your ratings offline.

## Features

- **Search and rate any song.** Songs and album artwork come from the free
  [iTunes Search API](https://performance-partners.apple.com/search-api); no
  API key or account needed.
- **Full albums.** Rating one song pulls in the album's complete tracklist,
  so you can work through the rest of it.
- **Stats at a glance.** The home page shows recently rated albums and your
  top-rated songs. Album averages are colour-coded by tier.
- **Browse your library.** Search, filter by genre, and sort albums by
  average rating, title, artist, release year or most recently rated.
- **Suggestions.** The Add page suggests unrated tracks from albums you've
  started, plus songs by your highest-rated artists.
- **Backup and restore.** Export your ratings as JSON and import them on
  another device.
- **Installable and offline.** It works as an app on iPhone, Android and
  desktop, with light and dark themes.

## Getting started

```sh
git clone https://github.com/JoeKanaan05/Song-Rating.git
cd Song-Rating
```

Open `index.html` in a browser and you're ready to go. Song search works
straight from disk.

Installing as an app and offline mode only work over HTTPS or on
`localhost`. To test them locally, serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

### Make it yours

- Edit `about.html` to write your intro and describe your rating scale.
- The rating tiers (9–10, 7–8.9, 5–6.9, 0–4.9) are set in `ratingTier()` in
  `js/utils.js` and coloured by the `.tier-*` classes in `css/components.css`.
- Theme colours are CSS variables at the top of `css/base.css`.
- The app name and icons are in `manifest.webmanifest` and `assets/`.

## Where your ratings are stored

Everything is saved in your browser's `localStorage`, and nothing is sent to
a server. Each browser, device and web address keeps its own ratings, so
`localhost` and your deployed site start out separate.

- Use **Export backup** on the Albums page to download a copy, and **Import**
  to load it somewhere else.
- Export regularly: clearing your browser's site data deletes your ratings.
- On iPhone, add the site to your Home Screen. Safari may clear storage for
  sites you haven't visited in a while, but it won't clear installed apps.

## Self-hosting on a Raspberry Pi

Any static host works, but these steps run it on a Raspberry Pi (tested on a
Zero 2 W). [Tailscale](https://tailscale.com) gives the Pi a private
`https://<name>.<tailnet>.ts.net` address that works from anywhere on devices
signed in to your Tailscale account.

1. Flash **Raspberry Pi OS Lite** with Raspberry Pi Imager. In its settings,
   set a username and your Wi-Fi and enable SSH, then SSH in
   (`ssh <username>@raspberrypi.local`).
2. Clone the site:

   ```sh
   sudo mkdir -p /var/www/song_rating
   sudo chown $USER:$USER /var/www/song_rating
   git clone https://github.com/JoeKanaan05/Song-Rating.git /var/www/song_rating
   ```

3. Serve it with nginx. The config also sends song searches through the Pi,
   because Apple redirects searches from iPhones to the Music app:

   ```sh
   sudo apt install nginx
   sudo cp /var/www/song_rating/deploy/nginx.conf /etc/nginx/sites-available/song-rating
   sudo ln -s /etc/nginx/sites-available/song-rating /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. Add HTTPS with Tailscale:

   ```sh
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   sudo tailscale serve --bg 8000
   ```

   In the Tailscale admin console, turn on **MagicDNS** and **HTTPS
   certificates**. Run `tailscale serve status` to see the address. Install
   Tailscale on your phone, open that address, and add it to your Home Screen.
   To make the site public instead, use `sudo tailscale funnel --bg 8000`.

**Updating:** run `git pull` in `/var/www/song_rating`. If `deploy/nginx.conf`
changed, repeat the `cp` and `nginx -t` lines from step 3.

## Development

### How updates reach installed apps

The service worker (`sw.js`) caches the whole site so pages open instantly
and work offline. When `CACHE_VERSION` in `sw.js` changes, installed apps
download the new version, which shows up the next time you switch pages.

A pre-commit hook bumps `CACHE_VERSION` automatically. Git doesn't copy hooks
when you clone, so set it up once:

```sh
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
sed -i '' -E "s/const CACHE_VERSION = \"[^\"]*\"/const CACHE_VERSION = \"$(date +%s)\"/" sw.js
git add sw.js
EOF
chmod +x .git/hooks/pre-commit
```

That `sed -i ''` syntax is for macOS. On Linux, use `sed -i -E ...` instead.

If you add or rename files, add them to `SITE_FILES` in `sw.js`.

### Project structure

```
.
├── index.html            Home: stats, recently rated albums, top-rated songs
├── albums.html           All albums: search, genre filter, sort
├── album.html            One album + full tracklist (album.html?id=<album-id>)
├── song.html             One song (song.html?album=<album-id>&track=<number>)
├── add.html              Search the catalog and rate a song
├── about.html            About you and your rating scale
├── manifest.webmanifest  App name, icons, colours for installing
├── sw.js                 Service worker: offline support + artwork cache
├── deploy/
│   └── nginx.conf        nginx site config for the Pi
├── css/
│   ├── base.css          Colours/tokens, reset, typography
│   ├── layout.css        Header, footer, page grids, responsive breakpoints
│   └── components.css    Cards, badges, covers, tracklist, detail pages
├── js/
│   ├── store.js          Loads/saves ratings in localStorage, export/import
│   ├── api.js            iTunes Search API: song search + album lookup
│   ├── utils.js          Helpers: album stats, sorting, formatting, URLs
│   ├── components.js     Shared header/footer + card/row/badge renderers
│   ├── nav.js            In-app navigation: swaps pages without reloading
│   └── pages/            One script per page (home, albums, album, song, add)
└── assets/
    ├── icon.svg          App icon (also the header logo and browser tab icon)
    └── icons/            favicon.ico, PNG app icons, Apple touch icon
```

Scripts load in this order on every page: `store.js` → `api.js` (Add page
only) → `utils.js` → `components.js` → `nav.js` → the page script.
