package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.systemsetting.SystemSetting;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaSystemSettingRepository extends JpaRepository<SystemSetting, Long> {
    Optional<SystemSetting> findByKey(String key);
    List<SystemSetting> findAllByOrderByKeyAsc();
}
