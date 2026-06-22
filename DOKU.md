# Beta Battle – Lokale Entwicklungsdokumentation

## Überblick

Beta Battle ist eine Plattform zur Verwaltung von Kletter-Wettkämpfen (Boulder, Lead, Speed).
Das System besteht aus mehreren Apps und einer Quarkus-API, die alle lokal per Podman/pnpm laufen.

---

## Architektur

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser                                │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Admin-App   │ Register-App │ Athleten-App │  Scoreboard        │
│  :3000       │  :3001       │  :3002       │  (geplant)         │
└──────┬───────┴──────┬───────┴──────┬───────┘
       │ /api + /auth │ /api proxy   │ /api + /auth
       ▼              ▼              ▼
┌─────────────────────────────┐
│      Quarkus API  :8090     │
│  inkl. interner Auth-Server │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────┐
│ PostgreSQL  │
│   :5432     │
└─────────────┘
```

**Kein externer Identity Provider** – Authentifizierung (JWT, Refresh-Token-Rotation, E-Mail-Verifikation, Passwort-Reset) ist vollständig in der Quarkus-API implementiert.

---

## Lokale Dienste

### PostgreSQL

| Eigenschaft | Wert |
|---|---|
| Container | `postgres-dev` |
| Image | `postgres:16` |
| Port | `5432` |
| Superuser | `postgres` / `postgres` |
| App-Datenbank | `BETA_BATTLE` |

**Starten:**
```bash
podman start postgres-dev
```

**Shell:**
```bash
podman exec -it postgres-dev psql -U postgres -d BETA_BATTLE
```

---

### Quarkus API

| Eigenschaft | Wert |
|---|---|
| Dev-Port | `8080` |
| Profil | `%dev` (Cookie ohne Secure-Flag, Mailer im Mock-Modus) |
| Dev-User UUID | `00000000-0000-0000-0000-000000000001` |
| Dev-User E-Mail | `dev@betabattle.local` |
| Swagger UI | http://localhost:8080/q/swagger-ui |
| Health | http://localhost:8080/q/health |
| JWKS | http://localhost:8080/auth/.well-known/jwks.json |

**Starten (im `api/`-Verzeichnis):**
```bash
./mvnw quarkus:dev
```

**Flyway Migrationen** (`api/src/main/resources/db/`):

| Version | Beschreibung |
|---|---|
| V1 | Initiales Schema (organization, competition, route, athlete, registration, …) |
| V2 | Standorte (location) |
| V3 | athlete.org_id entfernt |
| V4 | competition.start_date + end_date (TIMESTAMPTZ) |
| V5 | route.category_id |
| V6 | route.name |
| V7 | Unique Constraints auf Routen (Nr., Name, Reihenfolge pro Wettkampf+Kategorie) |
| V8 | athlete.org_id wieder hinzugefügt |
| V9 | competition.registration_token |
| V10 | score-Tabelle (topped/zoned/attempts) |
| V18 | Auth-Tabellen (users, refresh_tokens, password_reset_tokens, email_verifications) |
| V100 *(dev)* | Dev-Seed-Daten |

---

## Auth-System

Die API implementiert einen vollständigen OAuth2-ähnlichen Authentifizierungs-Flow mit JWT.

### Technologie

| Komponente | Bibliothek |
|---|---|
| JWT-Signierung & Validierung | SmallRye JWT (RS256, RSA-2048) |
| Passwort-Hashing | BCrypt (Cost 12, `at.favre.lib:bcrypt`) |
| Token-Hashing (DB) | SHA-256 (opaque Tokens) |
| E-Mail-Versand | Quarkus Mailer (Dev: Mock) |
| RSA-Schlüsselpaar | `api/src/main/resources/keys/` |

### Token-Flow

```
Login (POST /auth/login)
  → Access Token (JWT, 15 Min, im Memory der React-App)
  → Refresh Token (opaque UUID, 30 Tage, HttpOnly-Cookie auf /auth/token)

POST /auth/token (Token-Refresh)
  → altes Refresh Token wird revoked
  → neues Token-Paar wird ausgestellt (Rotation!)

POST /auth/logout
  → Refresh Token wird revoked
  → Cookie wird gelöscht
```

### Auth-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/auth/register` | Neues Konto anlegen (sendet Verifizierungs-E-Mail) |
| GET | `/auth/verify-email?token=…` | E-Mail-Adresse bestätigen |
| POST | `/auth/login` | Login mit E-Mail + Passwort → Access + Refresh Token |
| POST | `/auth/token` | Access Token erneuern (via HttpOnly-Cookie) |
| POST | `/auth/logout` | Session beenden, Cookie löschen |
| POST | `/auth/password-reset/request` | Passwort-Reset-E-Mail anfordern |
| POST | `/auth/password-reset/confirm` | Neues Passwort setzen |
| GET | `/auth/.well-known/jwks.json` | Öffentlicher RSA-Schlüssel (JWKS-Format) |

### Dev-Modus

Im Dev-Profil (`%dev`) greift das Admin-Frontend einen gespeziellen Bypass:
- `import.meta.env.DEV === true` → Auth-State wird direkt auf „authenticated" gesetzt
- Nutzer: `Dev User`, UUID `00000000-0000-0000-0000-000000000001`
- Kein echter API-Login nötig; die API akzeptiert im Dev-Profil alle Requests

---

## Frontend-Apps

### Admin-App

| Eigenschaft | Wert |
|---|---|
| Verzeichnis | `apps/admin/` |
| Port | `3000` |
| URL | http://localhost:3000 |
| Tech-Stack | React 19, Vite 8, TypeScript 6, TanStack Query v5, React Router v7 |

**Starten:**
```bash
pnpm --filter admin dev
```

**Auth-Pattern:**
- Beim Start: `POST /auth/token` (Cookie) → Access Token im Memory
- 14-Minuten-Intervall für proaktives Token-Refresh
- Dev-Modus: kein echtes Login nötig (siehe oben)

**Seiten:**

| Route | Beschreibung |
|---|---|
| `/login` | E-Mail/Passwort-Login |
| `/register` | Neues Konto anlegen |
| `/verify-email` | E-Mail-Bestätigung (per Link aus E-Mail) |
| `/dashboard` | Übersicht |
| `/dashboard/organisation` | Organisation & Standorte |
| `/dashboard/wettkampfe` | Wettkämpfe verwalten |
| `/dashboard/wettkampfe/:id` | Wettkampf-Detail (Kategorien, Routen, Anmeldungen, QR-Link) |
| `/dashboard/athleten` | Athletenverwaltung |
| `/dashboard/hilfe` | FAQ |

---

### Athleten-App

| Eigenschaft | Wert |
|---|---|
| Verzeichnis | `apps/athlete/` |
| Port | `3002` |
| URL | http://localhost:3002 |
| Tech-Stack | React 19, Vite 8, TypeScript 6, TanStack Query v5 |

**Starten:**
```bash
pnpm --filter athlete dev
```

**Flow:**
1. Athlet öffnet `http://localhost:3002`
2. App versucht Session-Wiederherstellung via `POST /auth/token` (Cookie)
3. Kein Cookie vorhanden → E-Mail/Passwort-Loginformular
4. Nach Login: API-Call `GET /athletes/me` → Athletenprofil + aktive Anmeldungen
5. **1 aktive Anmeldung** → direkt zur Boulder-Liste
6. **Mehrere Anmeldungen** → Wettkampf-Auswahlseite
7. Boulder-Liste: alle Routen der eigenen Kategorie mit ZONE/TOP-Toggle und Versuchszähler
8. Ergebnis wird sofort gespeichert (`PUT /scores/upsert`)

---

### Register-App (Selbstanmeldung)

| Eigenschaft | Wert |
|---|---|
| Verzeichnis | `apps/register/` |
| Port | `3001` |
| URL | http://localhost:3001 |
| Tech-Stack | React 19, Vite 8, TypeScript 6, TanStack Query v5 |

**Starten:**
```bash
pnpm --filter register dev
```

**Flow:**
1. Admin generiert in der Admin-App unter einem Wettkampf einen Registrierungslink
2. Link wird als QR-Code ausgedruckt und in der Halle aufgehängt
3. Athlet scannt QR-Code → landet auf `http://localhost:3001/{TOKEN}`
4. Formular erscheint direkt (kein Login erforderlich – anonyme Registrierung)
5. Athlet füllt Profil aus (Name, Geburtsdatum, Kategorie, …) und sendet ab
6. Backend legt Athletenprofil + Anmeldung an

**Registrierungslink-Format:** `http://localhost:3001/{8-stelliger-Token}`
Beispiel: `http://localhost:3001/UDB8YR72`

---

## Alle Apps zusammen starten

```bash
# 1. Datenbank starten
podman start postgres-dev

# 2. Quarkus API (separates Terminal)
cd api && ./mvnw quarkus:dev

# 3. Frontend-Apps (je ein Terminal)
pnpm --filter admin dev
pnpm --filter register dev
pnpm --filter athlete dev
```

---

## Dev-Seed-Daten

Die Datei `api/src/main/resources/db/dev/V100__dev_seed.sql` legt beim Start automatisch an:

| Entität | ID | Details |
|---|---|---|
| Organisation | `…000010` | „Dev Organisation" / Slug `dev-org` |
| Standort | `…000020` | „Dev Halle Regensburg" |
| Dev-User (users) | `…000001` | `dev@betabattle.local`, Rolle `ORGANIZER`, E-Mail verifiziert |
| Dev-User (org_user) | `…000030` | UUID `…000001`, Rolle `SUPERADMIN` |

---

## Wichtige Konfigurationsdateien

| Datei | Zweck |
|---|---|
| `api/src/main/resources/application.properties` | Quarkus-Konfiguration (DB, JWT, Mailer, Flyway, CORS) |
| `api/src/main/resources/keys/privateKey.pem` | RSA-2048 Privat-Schlüssel (JWT-Signierung) |
| `api/src/main/resources/keys/publicKey.pem` | RSA-2048 Öffentlicher Schlüssel (JWT-Validierung, JWKS) |
| `apps/admin/vite.config.ts` | Proxy `/api` + `/auth` → `http://localhost:8080`, Port 3000 |
| `apps/register/vite.config.ts` | Proxy `/api` → `http://localhost:8080`, Port 3001 |
| `apps/athlete/vite.config.ts` | Proxy `/api` + `/auth` → `http://localhost:8080`, Port 3002 |
| `apps/admin/src/auth/auth.ts` | JWT-Auth-Modul (Admin-App) |
| `apps/athlete/src/auth/auth.ts` | JWT-Auth-Modul (Athleten-App) |

---

## API-Endpunkte (Übersicht)

Basis-URL: `http://localhost:8080`

### Auth (`/auth`)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| POST | `/auth/register` | Öffentlich | Konto anlegen |
| GET | `/auth/verify-email` | Öffentlich | E-Mail verifizieren |
| POST | `/auth/login` | Öffentlich | Login → Access + Refresh Token |
| POST | `/auth/token` | Cookie | Token erneuern (Rotation) |
| POST | `/auth/logout` | Cookie | Session beenden |
| POST | `/auth/password-reset/request` | Öffentlich | Reset-E-Mail anfordern |
| POST | `/auth/password-reset/confirm` | Öffentlich | Neues Passwort setzen |
| GET | `/auth/.well-known/jwks.json` | Öffentlich | JWKS Public Key |

### API (`/api/v1`)

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/organizations/*` | JWT | Organisation verwalten |
| GET/POST/PUT/DELETE | `/locations/*` | JWT | Standorte verwalten |
| GET/POST/PUT/DELETE | `/competitions/*` | JWT | Wettkämpfe verwalten |
| POST | `/competitions/{id}/generate-token` | JWT | Registrierungs-Token generieren |
| GET | `/competitions/by-token/{token}` | Öffentlich | Wettkampf per Token laden |
| POST | `/competitions/by-token/{token}/register` | Öffentlich | Selbstanmeldung (anonym) |
| GET/POST/PUT/DELETE | `/competition-categories/*` | JWT | Kategorien verwalten |
| GET/POST/PUT/DELETE | `/routes/*` | JWT | Routen verwalten |
| GET/POST/PUT/DELETE | `/athletes/*` | JWT | Athleten verwalten |
| GET | `/athletes/me` | JWT | Eigenes Profil + aktive Anmeldungen |
| GET/POST/PUT/DELETE | `/registrations/*` | JWT | Anmeldungen verwalten |
| GET/PUT | `/scores/*` | JWT | Ergebnisse verwalten |
| PUT | `/scores/upsert` | JWT | Score erstellen oder aktualisieren |
| GET | `/scoreboard/{slug}` | Öffentlich | Öffentliche Ergebnisanzeige |

**Swagger UI:** http://localhost:8080/q/swagger-ui

---

## Geplante Apps

| App | Verzeichnis | Beschreibung |
|---|---|---|
| Scoreboard | `apps/scoreboard/` | Öffentliche Ergebnisanzeige (Beamer/TV in der Halle) |
