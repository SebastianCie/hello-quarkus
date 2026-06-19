package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "athlete")
public class Athlete extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "org_id")
    public UUID orgId;

    @Column(name = "user_id")
    public UUID userId;

    @Column(name = "first_name", nullable = false)
    public String firstName;

    @Column(name = "last_name", nullable = false)
    public String lastName;

    @Column(name = "date_of_birth")
    public LocalDate dateOfBirth;

    public String gender;

    public String club;

    public String nation;

    @Column(name = "license_number")
    public String licenseNumber;

    @Column(name = "created_at")
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
