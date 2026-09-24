package com.hotelbooking.domain.systemsetting;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "system_settings")
public class SystemSetting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "setting_key", nullable = false, unique = true)
    private String key;
    @Column(name = "setting_value")
    private String value;
    private String description;
    @Column(name = "updated_by")
    private Long updatedBy;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SystemSetting() {}

    public void update(String value, Long userId, Instant now) { this.value = value; this.updatedBy = userId; this.updatedAt = now; }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public String getDescription() { return description; }
}
