# Song Ratings

A website for my personal song reviews, organised by album. Plain HTML, CSS
and JavaScript, with no build step. Songs come from Apple's iTunes catalog;
ratings are saved in your browser, so each device keeps its own. It's a PWA,
so you can install it to your home screen and browse your ratings offline.

## Run it

It's a static site with no server code: open `index.html` in a browser.

Installing as an app and offline mode need the site served over HTTPS (or
`localhost`), which the Pi setup below provides.

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
   set a username, your Wi-Fi, and enable SSH. Then SSH in
   (`ssh <username>@raspberrypi.local`).
2. Clone the site:

   ```sh
   sudo mkdir -p /var/www/song_rating
   sudo chown $USER:$USER /var/www/song_rating
   git clone https://github.com/JoeKanaan05/Song-Rating.git /var/www/song_rating
   ```

3. Serve it with nginx. The config also passes song searches through to
   Apple, because Apple redirects iPhones' searches to the Music app:

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
   certificates**. `tailscale serve status` shows the address. Install
   Tailscale on your phone, open that address, and add it to your Home Screen.
   To make the site public instead, use `sudo tailscale funnel --bg 8000`.

To update the site, run `git pull` in `/var/www/song_rating`. The installed
app keeps its own copy of the site so pages open instantly. The pre-commit
hook changes `CACHE_VERSION` in `sw.js` on every commit, which tells the app to
download the new version. It shows up the next time you switch pages. If you
add or rename files, add them to `SITE_FILES` in `sw.js`.

If `deploy/nginx.conf` changed, copy it again and reload nginx (the two `sudo`
lines in step 3 that use `cp` and `nginx -t`).

## Structure

```
.
├── index.html          Home: stats, recently rated albums, top-rated songs
├── albums.html         All albums: search, genre filter, sort
├── album.html          One album + full tracklist (album.html?id=<album-id>)
├── song.html           One song (song.html?album=<album-id>&track=<number>)
├── add.html            Search the catalog and rate a song
├── about.html          About you and your rating scale
├── manifest.webmanifest  App name, icons, colours for installing
├── sw.js               Service worker: offline support + artwork cache
├── deploy/
│   └── nginx.conf      nginx site config for the Pi
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

