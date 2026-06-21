package de.heim.apps.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "competition_round")
public class CompetitionRound extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    @Column(name = "comp_id", nullable = false)
    public UUID compId;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String slug;

    @Column(name = "sort_order")
    public int sortOrder = 0;

    @Column(name = "start_at")
    public OffsetDateTime startAt;

    @Column(name = "end_at")
    public OffsetDateTime endAt;

    @Column(name = "advancement_count")
    public Integer advancementCount;

    @Column(nullable = false)
    public String status = "UPCOMING";
}
