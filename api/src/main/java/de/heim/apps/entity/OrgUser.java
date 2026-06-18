package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "org_user")
public class OrgUser extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "org_id", nullable = false)
    public UUID orgId;

    @Column(name = "user_id", nullable = false)
    public UUID userId;

    @Column(nullable = false)
    public String role;

    @Column(name = "location_id")
    public UUID locationId;

    @Column(name = "created_at")
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
