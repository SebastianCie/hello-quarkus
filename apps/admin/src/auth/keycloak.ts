import Keycloak from 'keycloak-js'

const DEV_MODE = import.meta.env.DEV

// In production these come from environment variables set at build/deploy time
const keycloak = DEV_MODE ? null : new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'https://keycloak.heim.apps',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'heim',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'beta-battle',
})

export { keycloak, DEV_MODE }
