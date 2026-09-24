package com.hotelbooking.domain.user;

import jakarta.persistence.*;

@Entity
@Table(name = "user_roles")
public class UserRole {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String name;

    protected UserRole() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public Role toRole() { return Role.valueOf(name); }
}
