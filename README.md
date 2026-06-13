<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/Logo-light.svg" />
  <source media="(prefers-color-scheme: light)" srcset="public/Logo.svg" />
  <img src="public/Logo.svg" alt="Scoop" height="120" />
</picture>

<br />

A self-hosted, real-time collaborative family recipe vault, meal planner, and shared shopping list - with interactive 3D elements, sound effects, and push notifications.

<br />

<a href="https://github.com/gorillasuti/Scoop"><img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge" /></a>
&nbsp;
<a href="https://scoop-88web.vercel.app/"><img alt="Live Demo" src="https://img.shields.io/badge/🌐_Live_Demo-Try_it_now-007bff?style=for-the-badge" /></a>
&nbsp;
<a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-6B7280?style=flat-square" /></a>
<a href="https://github.com/gorillasuti/Scoop"><img alt="Stars" src="https://img.shields.io/github/stars/gorillasuti/Scoop?style=flat-square&color=6B7280" /></a>

</div>

---

> **🌐 [Try the Live Demo →](https://scoop-88web.vercel.app/)**
>
> No setup needed - pre-filled credentials, 8 sample Hungarian recipes, full interaction.
> Data resets every 5 hours. Best viewed on mobile or use the built-in phone frame on desktop.

---

<div align="center">
  <a href="public/App%20images/Scoop%20-%20Home%20Screen.png"><img src="public/App%20images/Scoop%20-%20Home%20Screen.png" alt="Home Screen" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Create%20recepie.png"><img src="public/App%20images/Scoop%20-%20Create%20recepie.png" alt="Create Recipe" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Choose%20avatar.png"><img src="public/App%20images/Scoop%20-%20Choose%20avatar.png" alt="Choose Avatar" width="32%" /></a>
  <br />
  <a href="public/App%20images/Scoop%20-%20Register%20splash.png"><img src="public/App%20images/Scoop%20-%20Register%20splash.png" alt="Register Splash" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Finish%20onboarding.png"><img src="public/App%20images/Scoop%20-%20Finish%20onboarding.png" alt="Onboarding" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Settings%20screen.png"><img src="public/App%20images/Scoop%20-%20Settings%20screen.png" alt="Settings Screen" width="32%" /></a>
</div>

---

## What you get

<details open>
<summary><b>See all features</b></summary>

<table>
<tr>
<td width="50%" valign="top">

#### 🍲 Recipe Management

- **Recipe Builder** - Define prep/cook times, categories, difficulties, custom tags, and serving sizes.
- **Dynamic Ingredients** - Add, remove, and define quantity values and units.
- **Instruction Steps** - Break down cooking instructions into numbered steps.
- **Media Support** - Upload custom photos directly to recipes.
- **Search & Filters** - Real-time searching with category, difficulty, and tag filters.

</td>
<td width="50%" valign="top">

#### 📅 Meal Planning

- **Interactive Calendar** - Assign recipes to specific dates.
- **Planner Notes** - Attach custom messages, serving notes, or instructions to scheduled meals.
- **Family Alignment** - Keep everyone aligned on "what's for dinner" with sharing.

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### 👥 Family Collaboration

- **Real-Time Sync** - Real-time state updates across all family devices.
- **Family Onboarding** - Time-limited, token-based invite links to add members.
- **Push Notifications** - System notifications for new meals, shared lists, and invites.

</td>
<td width="50%" valign="top">

#### 🛒 Shared Shopping List

- **Recipe Auto-Extraction** - One-click import of ingredients from recipes directly into the list.
- **Real-Time Checklists** - Cross off items while shopping; status syncs instantly across devices.
- **Family Sharing** - Share lists dynamically with members of your family unit.

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### 🎮 Gamified UI & Customization

- **Sounds** - Playful mechanical clicks and completion chimes.
- **Haptic Vibrations** - Responsive phone vibrations for button presses.
- **Stay Awake Utility** - Prevents screen dimming while cooking.
- **3D Buttons** - Tactile 3D interactive controls.

</td>
<td width="50%" valign="top">

#### 📱 Mobile & PWA

- **Installable** - Install directly from the browser on iOS and Android.
- **Standalone Mode** - Fullscreen native feel, splash screen, and custom icon support.
- **Service Worker Cache** - Caches assets and provides an offline fallback page.

</td>
</tr>
</table>

</details>

<br />

## Easter Egg Games 🎮

Looking for a little fun while waiting for your water to boil or cake to bake? Scoop features built-in classic kitchen-break games! 
You can find and launch these games via the top header navigation menu. Tap 3x on your avatar in the top header to reveal the games menu.

<div align="center">
  <a href="public/App%20images/Scoop%20-%20Easter%20egg%20splash.png"><img src="public/App%20images/Scoop%20-%20Easter%20egg%20splash.png" alt="Easter Egg Games Entry" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Easter%20egg%20games.png"><img src="public/App%20images/Scoop%20-%20Easter%20egg%20games.png" alt="Easter Egg Games List" width="32%" /></a>
  <a href="public/App%20images/Scoop%20-%20Tic-Tac-Toe.png"><img src="public/App%20images/Scoop%20-%20Tic-Tac-Toe.png" alt="Tic-Tac-Toe Game" width="32%" /></a>
</div>

Currently available games:
- **Tic-Tac-Toe** - Challenge the unbeatable robot or play with a friend.
- **Sliding Puzzle** - Arrange the numbered grid tiles (3x3 or 4x4) into order. Includes an interactive auto-solver!
- **Connect Four** - Drop color discs to form a line of 4. Challenge a friend or the robot!

<br />

## Get started in 30 seconds

```bash
docker run -u root -d -p 9996:3000 \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e DATABASE_URL="postgresql://username:password@host:5432/database" \
  -v scoop_uploads:/app/public/uploads \
  kdani015/scoop
```

Open `http://localhost:9996`.

<div align="center">

&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#docker-compose-production">Docker Compose</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#install-as-app-pwa">Install as PWA</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#reverse-proxy">Reverse Proxy</a>&nbsp;&nbsp;·&nbsp;&nbsp;

</div>

<br />

## Tech stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

State management via React Server Actions + Context. Tactile interface utilizing custom 3D button rendering. Audio feedbacks powered by Web Audio API. Auth handled securely via NextAuth.js.

<br />

<h2 id="docker-compose-production">Docker Compose (production)</h2>

<details>
<summary>Full compose example with secure defaults</summary>

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-scoop}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-scoop_db}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-scoop} -d $${POSTGRES_DB:-scoop_db}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  web:
    image: kdani015/scoop:latest
    user: root
    restart: always
    ports:
      - "9996:3000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-scoop}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-scoop_db}?schema=public
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:9996}
      - AUTH_TRUST_HOST=true
      - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_EMAIL=${VAPID_EMAIL}
      - ALLOWED_DEV_ORIGINS=${ALLOWED_DEV_ORIGINS:-localhost}
    volumes:
      - uploads_data:/app/public/uploads
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:
  uploads_data:
```

Then:

```bash
docker compose up -d
```

</details>

<br />

<h2 id="install-as-app-pwa">Install as App (PWA)</h2>

Scoop works as a Progress Web App - no App Store needed.

1. Open Scoop in your browser (HTTPS required).
2. **iOS**: Share ▸ *Add to Home Screen*
3. **Android**: Menu ▸ *Install app* (or *Add to Home Screen*)

Scoop then launches fullscreen with its own icon, just like a native app.

<br />

## Updating

**Docker Compose:**

```bash
docker compose pull && docker compose up -d
```

**Docker run** - reuse the original volume paths:

```bash
docker pull kdani015/scoop
docker rm -f scoop
docker run -u root -d --name scoop -p 9996:3000 -v scoop_uploads:/app/public/uploads kdani015/scoop
```

<h2 id="reverse-proxy">Reverse Proxy</h2>

For production, put Scoop behind a TLS-terminating reverse proxy.

<details>
<summary>Nginx</summary>

```nginx
server {
    listen 80;
    server_name scoop.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scoop.yourdomain.com;

    ssl_certificate     /etc/ssl/fullchain.pem;
    ssl_certificate_key /etc/ssl/privkey.pem;

    # Covers large recipe photo uploads (e.g. 50 MB)
    client_max_body_size 50m;

    location / {
        proxy_pass http://localhost:9996;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

</details>

<details>
<summary>Caddy</summary>

```caddy
scoop.yourdomain.com {
    reverse_proxy localhost:9996
}
```

Caddy handles TLS automatically.

</details>

<br />

## Environment variables

<details>
<summary><b>Full reference</b></summary>

<br />

| Variable | Description | Default |
|----------|-------------|---------|
| **Core** | | |
| `DATABASE_URL` | PostgreSQL connection string. | - |
| `NEXTAUTH_SECRET` | Secret key for encryption of session tokens. Recommended: generate with `openssl rand -base64 32`. | - |
| `NEXTAUTH_URL` | The canonical homepage URL of the deployment. | `http://localhost:9996` |
| `AUTH_TRUST_HOST` | Must be set to `true` when deploying behind a reverse proxy (e.g. Cloudflare / Nginx). | `true` |
| `ALLOWED_DEV_ORIGINS` | Comma-separated allowed dev origins for hot-reloads and safe websockets. | `localhost` |
| **Web Push (VAPID)** | | |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key for push notifications. Generate with `npx web-push generate-vapid-keys`. | - |
| `VAPID_PRIVATE_KEY` | Private key for push notifications. | - |
| `VAPID_EMAIL` | Contact email prefix (formatted as `mailto:your@email.com`). | - |

</details>

<br />

## Data & Storage

- **Database** - PostgreSQL, schemas created and migrated automatically via Prisma Client
- **Uploads** - Recipe media stored in `/app/public/uploads`

<br />

## License

Scoop is licensed under the [MIT License](LICENSE).
