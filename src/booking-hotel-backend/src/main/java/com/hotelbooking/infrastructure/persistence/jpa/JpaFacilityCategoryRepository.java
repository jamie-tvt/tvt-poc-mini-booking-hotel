package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.FacilityCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaFacilityCategoryRepository extends JpaRepository<FacilityCategory, Long> {
    List<FacilityCategory> findAllByOrderByIdAsc();
    boolean existsByNameIgnoreCase(String name);
}
