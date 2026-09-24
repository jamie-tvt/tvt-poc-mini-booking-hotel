package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.Facility;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaFacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findAllByOrderByIdAsc();
    long countByCategoryId(Long categoryId);

    @Query(value = "select count(*) from room_type_facilities where facility_id = :id", nativeQuery = true)
    long countUsage(@Param("id") Long id);
}
