# Deploying the web app to cPanel (shared hosting)

The web app is plain static files after `npm run build`, so shared hosting is a good home for it.
The backend (Java) runs on a separate small server, see the backend repository's `DEPLOYMENT.md`.
Do the backend first, or at least know its address (default `https://api.alpharesearchlabs.org`).

## 1. Build the files (on your PC)
```powershell
cd frontend
copy .env.production.example .env.production      # edit VITE_API_BASE_URL if your API address differs
npm ci
npm run build
tar -a -c -f cherrytrack-web.zip -C dist .         # zip of everything in dist, including the hidden .htaccess
```
`VITE_API_BASE_URL` is baked into the build, so rebuild if the API address ever changes.

## 2. Create the subdomain in cPanel
**Domains > Create A New Domain**, enter `cherrytrack.alpharesearchlabs.org`, untick "Share document root",
and keep the suggested folder (`public_html/cherrytrack`). Create it.

## 3. Upload
1. **File Manager**, open the folder `public_html/cherrytrack`, delete any placeholder file in it.
2. **Upload** `cherrytrack-web.zip`, then right-click it and **Extract**, then delete the zip.
3. Click **Settings** (top right) and tick **Show Hidden Files (dotfiles)**. You must now see `.htaccess` next to
   `index.html` and the `assets` folder. `.htaccess` is what makes pages such as `/deliveries` work after a
   reload, so make sure it is there.

## 4. HTTPS
**SSL/TLS Status**, tick `cherrytrack.alpharesearchlabs.org` and click **Run AutoSSL**. After a minute the
site opens with a padlock at `https://cherrytrack.alpharesearchlabs.org`. The sign-in cookie only works over HTTPS.

## 5. Check
Open the site, sign in, open Deliveries, press F5 (the page must stay, not show a 404), and reload once
more: you must stay signed in. If sign-in fails with a network or CORS error:

- the API is not reachable: open `https://api.alpharesearchlabs.org/api/v1/branding` in the browser;
- or `WEB_ORIGIN` in the backend's `deploy/.env` does not exactly equal `https://cherrytrack.alpharesearchlabs.org`
  (no trailing slash). After editing run `docker compose -f docker-compose.prod.yml up -d` on the server.

## Updating the site later
Run steps 1 and 3 again (delete the old `assets` folder first so old files do not pile up). Users get the
new version on their next page load.

## Why the API is on a sibling subdomain
`cherrytrack.` and `api.` share the registrable domain `alpharesearchlabs.org`, so the browser treats them as
one site. That is what lets the `SameSite=Strict` sign-in cookie travel to the API. Hosting the API on an
unrelated domain would break silent sign-in after 30 minutes.
