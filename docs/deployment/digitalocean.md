# South Rally DigitalOcean Deployment

## Production topology

- Domain: `southrally.novaryn.com`
- Host: one Ubuntu 24.04 LTS DigitalOcean Droplet
- Runtime: Docker Compose
- TLS/reverse proxy: Caddy with automatic Let's Encrypt certificates
- Application image: `ghcr.io/eisendev/southrally:latest`
- Database: the dedicated South Rally Supabase PostgreSQL project

The application container is not directly published to the internet. Caddy is
the only service exposing ports 80 and 443 and proxies requests to `web:3000`.

## Required GitHub Actions secrets

Configure these under **Repository → Settings → Secrets and variables → Actions**:

- `DROPLET_HOST`
- `DROPLET_USER` (recommended value: `deploy`)
- `SSH_PRIVATE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Never commit production credentials or copy them into `docker-compose.yml`.

## DNS

Create an `A` record at the DNS provider:

```text
Type: A
Name: southrally
Value: <DROPLET_IPV4_ADDRESS>
TTL: 300
```

Remove conflicting `A`, `AAAA`, or `CNAME` records for the same hostname. Caddy
can issue the certificate after ports 80/443 are reachable and DNS resolves.

## First deployment verification

```bash
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 caddy
curl -I https://southrally.novaryn.com
```

Expected result: both containers are healthy/running and the HTTPS request
returns an application response without certificate warnings.
