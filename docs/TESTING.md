# Testing

## Static checks

```bash
npm run check        # TypeScript (no emit) and ESLint
```

Both are kept at zero errors and zero warnings.

## End-to-end tests

The Playwright tests in `tests/e2e/` run against a **production build** on port 3123, in a desktop and a mobile (touch, phone-sized) project:

```bash
npm run build
npm run test:e2e                 # starts `next start -p 3123` if nothing is running there
npm run test:e2e:report          # open the HTML report
```

- `E2E_BASE_URL=https://…` tests an already running site instead.
- `PW_CHANNEL` picks the browser channel (default `msedge`, for example `chrome`).

They cover:
- every public page and topic hall, with no console errors
- the 3D-first routing and the 2D switch
- the world and the gateway
- the sitemap and robots
- the not-found page
- that no list ever shows invented entries
- that every command-centre page, export and upload is closed to signed-out visitors

Without a database the lists are empty, so the three "first item listed on /events, /gallery, /vault opens" tests are **skipped**. They run once the site is connected and has published items.

## Manual checks worth doing before a release

- Run the gateway intro on a phone: the knight appears and the sword strike plays.
- Use the 3D/2D switch on a few pages.
- Sign in to `/admin` and publish, edit and archive one item of each kind.
- Submit the contact and membership forms with an invalid e-mail (the fields should show errors), then with valid details.
