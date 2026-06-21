package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "round_participant")
public class RoundParticipant extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "round_id", nullable = false)
    public UUID roundId;

    @Column(name = "registration_id", nullable = false)
    public UUID registrationId;
}
