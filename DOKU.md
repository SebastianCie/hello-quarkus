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
       │ /api proxy   │ /api proxy   │ /api proxy
       ▼              ▼              ▼
┌─────────────────────────────┐
│      Quarkus API  :8090     │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │  Keycloak   │
│   :5432     │  │   :8080     │
└─────────────┘  └─────────────┘
```

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
| Keycloak-Datenbank | `keycloak` |
| Keycloak-DB-User | `keycloak_user` / `supersecret` |

**Starten:**
```bash
podman start postgres-dev
```

**Shell:**
```bash
podman exec -it postgres-dev psql -U postgres -d BETA_BATTLE
```

---

### Keycloak

| Eigenschaft | Wert |
|---|---|
| Container | `keycloak` |
| Image | `quay.io/keycloak/keycloak:26.6.3` |
| Port | `8080` |
| Admin-Konsole | http://localhost:8080 |
| Admin-User | `admin` |
| Admin-Passwort | `admin123` |
| Realm | `heim` |
| Datenbank | PostgreSQL `keycloak` |
| Modus | `start-dev` (nur lokal) |

**Starten:**
```bash
podman start keycloak
```

**Neu erstellen (falls Container gelöscht):**
```bash
podman run -d \
  --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin123 \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://host.containers.internal:5432/keycloak \
  -e KC_DB_USERNAME=keycloak_user \
  -e KC_DB_PASSWORD=supersecret \
  -e KC_HTTP_ENABLED=true \
  -e KC_HOSTNAME_STRICT=false \
  quay.io/keycloak/keycloak:26.6.3 \
  start-dev
```

**Realm-Einstellungen:**
- Selbstregistrierung: aktiviert (`registrationAllowed: true`)
- E-Mail als Username: aktiviert

#### Keycloak-Clients (Realm `heim`)

| Client-ID | Verwendung | Typ | Redirect URI |
|---|---|---|---|
| `beta-battle` | Admin-App | Public | `http://localhost:3000/*` |
| `beta-battle-athlete` | Register- & Athleten-App | Public | `http://localhost:3001/*`, `http://localhost:3002/*` |
| `beta-battle-backend` | Quarkus API (Service Account) | Confidential | — |

**Backend-Client Secret:**
```
kZVyt2Uy5l0MoVEW7YMJT2t4h7iELdNB
```

> Dieses Secret steht in `application.properties` als Default-Wert und wird in Prod per Umgebungsvariable `KEYCLOAK_CLIENT_SECRET` überschrieben.

---

### Quarkus API

| Eigenschaft | Wert |
|---|---|
| Dev-Port | `8090` |
| Profil | `%dev` (OIDC deaktiviert, alle Requests erlaubt) |
| Dev-User UUID | `00000000-0000-0000-0000-000000000001` |
| Swagger UI | http://localhost:8090/q/swagger-ui |
| Health | http://localhost:8090/q/health |

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
| V100 *(dev)* | Dev-Seed-Daten |

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

**Dev-Login:** Im Dev-Modus (`import.meta.env.DEV`) ist Keycloak deaktiviert.
Der Admin wird automatisch als `Dev User` (UUID `00000000-0000-0000-0000-000000000001`) eingeloggt.

**Seiten:**

| Route | Beschreibung |
|---|---|
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
| Tech-Stack | React 19, Vite 8, TypeScript 6, TanStack Query v5, keycloak-js |

**Starten:**
```bash
pnpm --filter athlete dev
```

**Flow:**
1. Athlet öffnet `http://localhost:3002`
2. Wenn nicht eingeloggt → Keycloak-Login
3. API-Call `GET /athletes/me` → gibt Athletenprofil + aktive Anmeldungen zurück
4. Wenn **1 aktive Anmeldung** → direkt zur Boulder-Liste
5. Wenn **mehrere Anmeldungen** → Wettkampf-Auswahlseite
6. Boulder-Liste: alle Routen der eigenen Kategorie mit ZONE/TOP-Toggle und Versuchszähler
7. Ergebnis wird sofort gespeichert (`PUT /scores/upsert`)

---

### Register-App (Selbstanmeldung)

| Eigenschaft | Wert |
|---|---|
| Verzeichnis | `apps/register/` |
| Port | `3001` |
| URL | http://localhost:3001 |
| Tech-Stack | React 19, Vite 8, TypeScript 6, TanStack Query v5, keycloak-js |

**Starten:**
```bash
pnpm --filter register dev
```

**Flow:**
1. Admin generiert in der Admin-App unter einem Wettkampf einen Registrierungslink
2. Link wird als QR-Code ausgedruckt und in der Halle aufgehängt
3. Athlet scannt QR-Code → landet auf `http://localhost:3001/{TOKEN}`
4. **Schritt 1:** Keycloak-Login (Google, GitHub oder E-Mail+Passwort)
5. **Schritt 2:** Athletenprofil ausfüllen (Name, Geburtsdatum, Kategorie, …)
6. Athlet ist angemeldet und hat einen Keycloak-Account

**Registrierungslink-Format:** `http://localhost:3001/{8-stelliger-Token}`
Beispiel: `http://localhost:3001/UDB8YR72`

---

## Alle Apps zusammen starten

```bash
# 1. Container starten
podman start postgres-dev keycloak

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
| Dev-User (org_user) | `…000030` | UUID `…000001`, Rolle `SUPERADMIN` |

---

## Wichtige Konfigurationsdateien

| Datei | Zweck |
|---|---|
| `api/src/main/resources/application.properties` | Quarkus-Konfiguration (DB, Keycloak, Flyway, Auth) |
| `apps/admin/vite.config.ts` | Proxy `/api` → `http://localhost:8090` |
| `apps/register/vite.config.ts` | Proxy `/api` → `http://localhost:8090`, Port 3001 |
| `apps/admin/src/auth/keycloak.ts` | Keycloak-Client für Admin-App |
| `apps/register/src/auth/keycloak.ts` | Keycloak-Client für Register-App (Client-ID: `beta-battle-athlete`) |
| `apps/athlete/vite.config.ts` | Proxy `/api` → `http://localhost:8090`, Port 3002 |
| `apps/athlete/src/auth/keycloak.ts` | Keycloak-Client für Athleten-App (Client-ID: `beta-battle-athlete`) |

---

## API-Endpunkte (Übersicht)

Basis-URL: `http://localhost:8090/api/v1`

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| POST | `/account/register` | Öffentlich | Admin-Account anlegen |
| GET/POST/PUT/DELETE | `/organizations/*` | Auth | Organisation verwalten |
| GET/POST/PUT/DELETE | `/locations/*` | Auth | Standorte verwalten |
| GET/POST/PUT/DELETE | `/competitions/*` | Auth | Wettkämpfe verwalten |
| POST | `/competitions/{id}/generate-token` | Auth | Registrierungs-Token generieren |
| GET | `/competitions/by-token/{token}` | Öffentlich | Wettkampf per Token laden |
| POST | `/competitions/by-token/{token}/register` | Öffentlich* | Selbstanmeldung |
| GET/POST/PUT/DELETE | `/competition-categories/*` | Auth | Kategorien verwalten |
| GET/POST/PUT/DELETE | `/routes/*` | Auth | Routen verwalten |
| GET/POST/PUT/DELETE | `/athletes/*` | Auth | Athleten verwalten |
| GET | `/athletes/me` | Auth (Keycloak) | Eigenes Profil + aktive Anmeldungen |
| GET/POST/PUT/DELETE | `/registrations/*` | Auth | Anmeldungen verwalten |
| GET/POST/PUT/DELETE | `/scores/*` | Auth | Ergebnisse verwalten |
| PUT | `/scores/upsert` | Auth | Score erstellen oder aktualisieren (nach registrationId + routeId) |

*Im Dev-Modus ohne Auth nutzbar, in Prod mit Keycloak-Token (Athlet muss eingeloggt sein)

**Swagger UI:** http://localhost:8090/q/swagger-ui

---

## Geplante Apps

| App | Verzeichnis | Beschreibung |
|---|---|---|
| Scoreboard | `apps/scoreboard/` | Öffentliche Ergebnisanzeige (Beamer/TV in der Halle) |
