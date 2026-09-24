package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.user.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaUserRoleRepository extends JpaRepository<UserRole, Long> {
    Optional<UserRole> findByName(String name);
}
