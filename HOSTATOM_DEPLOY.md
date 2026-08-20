# HostAtom production deployment

This project uses a Next.js static export for the UI and PHP 8.3 + MariaDB for authenticated APIs.

## Before deployment

1. Back up `httpdocs` and the MariaDB database in Plesk.
2. Rotate the database password that was previously committed to Git. Do not reuse it.
3. Purge the leaked credential and citizen-ID files from Git history before making the repository public again.
4. Keep `private/personnel-auth.json` off Git and outside `httpdocs`.

## Database migration

1. Open phpMyAdmin in Plesk.
2. Select the MMV database.
3. Run `database/migrations/001_secure_auth.sql`.
4. Run `database/migrations/002_room_bookings.sql` to create the shared room-booking tables.
5. Copy `public/api/config.example.php` to `public/api/config.local.php` and fill in the newly rotated credentials.
6. Upload `private/personnel-auth.json` to a private directory outside `httpdocs`.
7. Run the CLI-only importer with Plesk PHP 8.3. Example:

   ```sh
   /opt/plesk/php/8.3/bin/php /var/www/vhosts/mmvschool.ac.th/httpdocs/api/import-auth-cli.php /PRIVATE_PATH/personnel-auth.json
   ```

8. Delete the private authentication JSON immediately after a successful import.

## Build and upload

```sh
npm ci
npm run lint
npm run build
```

Upload the contents of `out/` to `httpdocs/`. Preserve the production `api/config.local.php` when replacing files.

Verify these endpoints after upload:

- `GET /api/health.php` returns HTTP 200, `database: connected`, and `schema: ready`.
- `GET /api/auth.php` returns `authenticated: false` before login.
- Login creates an `MMVSESSID` cookie with `HttpOnly`, `Secure`, and `SameSite=Strict`.
- A teacher opening `/#admin_console` does not receive the Admin Console.

Do not test production by posting directly to mutation endpoints with real personnel data.
