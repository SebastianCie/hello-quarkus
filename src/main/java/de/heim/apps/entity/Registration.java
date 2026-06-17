package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "registration")
public class Registration extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "comp_id", nullable = false)
    public UUID compId;

    @Column(name = "athlete_id", nullable = false)
    public UUID athleteId;

    @Column(name = "category_id")
    public UUID categoryId;

    @Column(nullable = false)
    public String status = "PENDING";

    @Column(name = "start_number")
    public String startNumber;

    @Column(name = "registered_at")
    public OffsetDateTime registeredAt = OffsetDateTime.now();

    @Column(name = "confirmed_at")
    public OffsetDateTime confirmedAt;
}
