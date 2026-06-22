package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    public String tokenHash;

    @Column(name = "expires_at", nullable = false)
    public OffsetDateTime expiresAt;

    @Column(nullable = false)
    public boolean used = false;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    public static PasswordResetToken findValid(String tokenHash) {
        return find("tokenHash = ?1 AND used = false AND expiresAt > ?2",
                tokenHash, OffsetDateTime.now()).firstResult();
    }
}
