package de.heim.apps.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.net.ssl.*;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@ApplicationScoped
public class KeycloakAdminService {

    @Inject
    ObjectMapper mapper;

    @ConfigProperty(name = "beta-battle.keycloak.url", defaultValue = "")
    String keycloakUrl;

    @ConfigProperty(name = "beta-battle.keycloak.realm", defaultValue = "heim")
    String realm;

    @ConfigProperty(name = "beta-battle.keycloak.client-id", defaultValue = "beta-battle")
    String clientId;

    @ConfigProperty(name = "beta-battle.keycloak.client-secret", defaultValue = "")
    String clientSecret;

    public boolean isEnabled() {
        return !keycloakUrl.isBlank() && !clientSecret.isBlank();
    }

    /**
     * Creates a Keycloak user and returns their UUID (sub).
     */
    public String createUser(String username, String password, Optional<String> email) {
        try {
            String adminToken = fetchAdminToken();
            return createKeycloakUser(adminToken, username, password, email);
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            throw new WebApplicationException("Keycloak user creation failed: " + e.getMessage(),
                    Response.Status.BAD_GATEWAY);
        }
    }

    private String fetchAdminToken() throws Exception {
        String body = "grant_type=client_credentials"
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);

        HttpResponse<String> res = client().send(
                HttpRequest.newBuilder()
                        .uri(URI.create(keycloakUrl + "/realms/" + realm + "/protocol/openid-connect/token"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() != 200)
            throw new Exception("Could not obtain admin token: " + res.body());

        return mapper.readTree(res.body()).get("access_token").asText();
    }

    private String createKeycloakUser(String adminToken, String username, String password,
            Optional<String> email) throws Exception {

        Map<String, Object> userRep = new java.util.LinkedHashMap<>();
        userRep.put("username", username);
        userRep.put("enabled", true);
        email.filter(e -> !e.isBlank()).ifPresent(e -> userRep.put("email", e));
        userRep.put("credentials", List.of(
                Map.of("type", "password", "value", password, "temporary", false)));

        HttpResponse<String> res = client().send(
                HttpRequest.newBuilder()
                        .uri(URI.create(keycloakUrl + "/admin/realms/" + realm + "/users"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + adminToken)
                        .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(userRep)))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        if (res.statusCode() == 409)
            throw new WebApplicationException("Username already exists", Response.Status.CONFLICT);
        if (res.statusCode() != 201)
            throw new Exception("Unexpected status " + res.statusCode() + ": " + res.body());

        // Keycloak returns the new user URL in the Location header: .../users/{uuid}
        String location = res.headers().firstValue("Location")
                .orElseThrow(() -> new Exception("No Location header in Keycloak response"));
        return location.substring(location.lastIndexOf('/') + 1);
    }

    private HttpClient client() throws Exception {
        // Trust-all SSL context — consistent with quarkus.oidc.tls.verification=none
        SSLContext ssl = SSLContext.getInstance("TLS");
        ssl.init(null, new TrustManager[]{new X509TrustManager() {
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            public void checkClientTrusted(X509Certificate[] c, String a) {}
            public void checkServerTrusted(X509Certificate[] c, String a) {}
        }}, new SecureRandom());
        return HttpClient.newBuilder().sslContext(ssl).build();
    }
}
