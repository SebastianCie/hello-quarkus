package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "score")
public class Score extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "registration_id", nullable = false)
    public UUID registrationId;

    @Column(name = "route_id", nullable = false)
    public UUID routeId;

    @Column(name = "athlete_id", nullable = false)
    public UUID athleteId;

    @Column(name = "judge_id")
    public UUID judgeId;

    public int attempts = 0;

    public boolean topped = false;

    public boolean zoned = false;

    @Column(name = "bonus_points")
    public int bonusPoints = 0;

    @Column(name = "final_score")
    public Integer finalScore;

    @Column(name = "scored_at")
    public OffsetDateTime scoredAt = OffsetDateTime.now();
}
