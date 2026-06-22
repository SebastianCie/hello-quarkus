// Keycloak wurde durch den internen Auth-Server ersetzt.
// Importe auf ./auth umstellen.
export { getAccessToken as getToken } from './auth'
