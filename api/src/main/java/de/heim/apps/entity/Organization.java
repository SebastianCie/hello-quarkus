package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organization")
public class Organization extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(nullable = false)
    public String name;

    @Column(unique = true, nullable = false)
    public String slug;

    @Column(name = "contact_email")
    public String contactEmail;

    @Column(name = "logo_url")
    public String logoUrl;

    @Column(name = "created_at")
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
