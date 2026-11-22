# CR-10 — SEO and public discoverability

## Added
- Root metadata now includes canonical URL, Open Graph metadata, and Twitter large-card metadata.
- `NEXT_PUBLIC_APP_URL` is used as the metadata base when configured; no production domain is hard-coded.
- `robots.txt` allows public discovery while excluding dashboard, admin, API, and authentication routes from crawling.
- `sitemap.xml` lists the public landing page only and is emitted only when `NEXT_PUBLIC_APP_URL` is configured.
- Web app manifest provides the app name, description, theme colors, and favicon.
- Auth routes and the authenticated app route group explicitly emit `noindex` metadata.

## Configuration
Set `NEXT_PUBLIC_APP_URL` to the exact public HTTPS origin (without a trailing slash), for example `https://your-domain.example`. The sitemap and robots host/sitemap declarations depend on this value.

## Verification
After deployment, inspect `/robots.txt`, `/sitemap.xml`, and `/manifest.webmanifest`. Confirm canonical and Open Graph URLs use the production domain, and confirm dashboard/auth pages include `noindex`. Search engine indexing is asynchronous and is not guaranteed by these technical signals.

## Limitations
This milestone does not create legal pages, backlink campaigns, analytics, or search-engine accounts. It does not guarantee rankings or indexing.
