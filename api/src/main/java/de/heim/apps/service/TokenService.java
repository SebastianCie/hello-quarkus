package de.heim.apps.service;

import de.heim.apps.entity.User;
import io.smallrye.jwt.build.Jwt;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.InputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.*;

@ApplicationScoped
public class TokenService {

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    String issuer;

    private RSAPublicKey rsaPublicKey;
    private Map<String, Object> jwksCache;

    @PostConstruct
    void init() {
        try (InputStream is = getClass().getResourceAsStream("/keys/publicKey.pem")) {
            String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            String b64 = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                           .replace("-----END PUBLIC KEY-----", "")
                           .replaceAll("\\s+", "");
            byte[] der = Base64.getDecoder().decode(b64);
            rsaPublicKey = (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(der));
            jwksCache = buildJwks();
        } catch (Exception e) {
            throw new RuntimeException("Failed to load RSA public key for JWKS", e);
        }
    }

    public String issueAccessToken(User user) {
        return Jwt.issuer(issuer)
                .subject(user.id.toString())
                .claim("email", user.email)
                .groups(Set.of(user.role))
                .expiresIn(Duration.ofMinutes(15))
                .sign();
    }

    public Map<String, Object> getJwks() {
        return jwksCache;
    }

    private Map<String, Object> buildJwks() {
        byte[] mod = stripLeadingZero(rsaPublicKey.getModulus());
        byte[] exp = stripLeadingZero(rsaPublicKey.getPublicExponent());

        Map<String, Object> jwk = new LinkedHashMap<>();
        jwk.put("kty", "RSA");
        jwk.put("use", "sig");
        jwk.put("alg", "RS256");
        jwk.put("kid", "betabattle-key-1");
        jwk.put("n", Base64.getUrlEncoder().withoutPadding().encodeToString(mod));
        jwk.put("e", Base64.getUrlEncoder().withoutPadding().encodeToString(exp));

        return Map.of("keys", List.of(jwk));
    }

    private byte[] stripLeadingZero(BigInteger value) {
        byte[] bytes = value.toByteArray();
        if (bytes[0] == 0) {
            return Arrays.copyOfRange(bytes, 1, bytes.length);
        }
        return bytes;
    }
}
