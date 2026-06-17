package de.heim.apps;

import org.eclipse.microprofile.openapi.annotations.Components;
import org.eclipse.microprofile.openapi.annotations.OpenAPIDefinition;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType;
import org.eclipse.microprofile.openapi.annotations.info.Info;
import org.eclipse.microprofile.openapi.annotations.security.OAuthFlow;
import org.eclipse.microprofile.openapi.annotations.security.OAuthFlows;
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme;

import jakarta.ws.rs.core.Application;

@OpenAPIDefinition(
    info = @Info(title = "Beta Battle API", version = "1.0.0"),
    components = @Components(
        securitySchemes = @SecurityScheme(
            securitySchemeName = "oauth2",
            type = SecuritySchemeType.OAUTH2,
            flows = @OAuthFlows(
                authorizationCode = @OAuthFlow(
                    authorizationUrl = "https://keycloak.heim.apps/realms/heim/protocol/openid-connect/auth",
                    tokenUrl = "https://keycloak.heim.apps/realms/heim/protocol/openid-connect/token",
                    refreshUrl = "https://keycloak.heim.apps/realms/heim/protocol/openid-connect/token"
                )
            )
        )
    )
)
public class OpenApiConfig extends Application {
}
