# Song Ratings

A website for my personal song reviews, organised by album. Plain HTML, CSS
and JavaScript, with no build step. Songs come from Apple's iTunes catalog;
ratings are saved in your browser, so each device keeps its own. It's a PWA,
so you can install it to your home screen and browse your ratings offline.

## Run it

From the project folder:

```sh
python3 server.py        # opens http://localhost:8000 — Ctrl+C to stop
```

The server uses only Python's standard library, so there's nothing to install.
It just serves the files: you can also open `index.html` directly, but
installing as an app and offline mode need the server.

## Rate a song

Click **+ Add new**, search for any song, and pick it. The full album
(cover + complete tracklist) is pulled from the iTunes Search API and saved,
so unrated tracks show up too. Rate other tracks from the album or song page.

Every change is saved in this browser's storage (`localStorage`). Ratings stay
on the device: a different browser, device, or web address (e.g. `localhost`
vs. the Pi) starts empty. Use **Export backup** on the Albums page to download
a copy, and **Import** to load it on another device. Export regularly: clearing
your browser's site data deletes your ratings.

On iPhone, add the site to your Home Screen; Safari may clear storage for
sites you haven't visited in a while, but not for installed apps.

## Put it on a Raspberry Pi (Zero 2 W)

Installing as an app and offline mode only work over HTTPS (or on
`localhost`), so the Pi needs HTTPS. The easiest way is
[Tailscale](https://tailscale.com), which gives the Pi a private
`https://<name>.<tailnet>.ts.net` address that works from anywhere on
devices signed in to your Tailscale account.

1. Flash **Raspberry Pi OS Lite** with Raspberry Pi Imager. In its settings,
   set a username, your Wi-Fi, and enable SSH. Python 3 is already included.
2. Copy the site over from this folder (replace `pi` with your username):

   ```sh
   rsync -av --delete --exclude .git --exclude data \
     ./ pi@raspberrypi.local:song-ratings/
   ```

3. Run it on boot. If your username isn't `pi`, first edit `User=` and the
   paths in `deploy/song-ratings.service`. Then SSH in
   (`ssh pi@raspberrypi.local`) and run:

   ```sh
   sudo cp ~/song-ratings/deploy/song-ratings.service /etc/systemd/system/
   sudo systemctl enable --now song-ratings
   ```

4. Add HTTPS with Tailscale:

   ```sh
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   sudo tailscale serve --bg 8000
   ```

   In the Tailscale admin console, turn on **MagicDNS** and **HTTPS
   certificates**. `tailscale serve status` shows the address. Install
   Tailscale on your phone, open that address, and add it to your Home Screen.
   To make the site public instead, use `sudo tailscale funnel --bg 8000`.

To update the site later, run the `rsync` command again. No restart is needed.
If you add or rename files, add them to `SITE_FILES` in `sw.js` and bump
`CACHE_VERSION`.

## Structure

```
.
├── index.html          Home: stats, recently rated albums, top-rated songs
├── albums.html         All albums: search, genre filter, sort
├── album.html          One album + full tracklist (album.html?id=<album-id>)
├── song.html           One song (song.html?album=<album-id>&track=<number>)
├── add.html            Search the catalog and rate a song
├── about.html          About you and your rating scale
├── server.py           Serves the site (locally or on the Pi)
├── manifest.webmanifest  App name, icons, colours for installing
├── sw.js               Service worker: offline support + artwork cache
├── deploy/
│   └── song-ratings.service  systemd service for the Pi
├── css/
│   ├── base.css        Colours/tokens, reset, typography
│   ├── layout.css      Header, footer, page grids, responsive breakpoints
│   └── components.css  Cards, badges, covers, tracklist, detail pages
├── js/
│   ├── store.js        Loads/saves ratings in localStorage, export/import
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
    ├── favicon.svg
    └── icons/          App icons (192, 512, Apple touch icon)
```

Scripts load in this order on every page: `store.js` → (`api.js` on the add
page) → `utils.js` → `components.js` → the page script.
