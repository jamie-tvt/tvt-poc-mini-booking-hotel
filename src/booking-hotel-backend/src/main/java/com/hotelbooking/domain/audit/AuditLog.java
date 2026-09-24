package com.hotelbooking.domain.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id")
    private Long userId;
    @org.hibernate.annotations.Formula("(select u.email from users u where u.id = user_id)")
    private String userEmail;
    @Column(nullable = false)
    private String action;
    @Column(name = "entity_type", nullable = false)
    private String entityType;
    @Column(name = "entity_id")
    private Long entityId;
    @Column(nullable = false)
    private String result;
    private String detail;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuditLog() {}
    public AuditLog(Long userId, String action, String entityType, Long entityId, String result, String detail, Instant now) {
        this.userId = userId; this.action = action; this.entityType = entityType; this.entityId = entityId;
        this.result = result; this.detail = detail == null ? null : detail.substring(0, Math.min(500, detail.length()));
        this.createdAt = now;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserEmail() { return userEmail; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public Long getEntityId() { return entityId; }
    public String getResult() { return result; }
    public String getDetail() { return detail; }
    public Instant getCreatedAt() { return createdAt; }
}
