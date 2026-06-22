package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(unique = true, nullable = false)
    public String email;

    @Column(name = "password_hash")
    public String passwordHash;

    @Column(name = "display_name")
    public String displayName;

    @Column(nullable = false)
    public String role;

    @Column(name = "email_verified", nullable = false)
    public boolean emailVerified = false;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    public static User findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
