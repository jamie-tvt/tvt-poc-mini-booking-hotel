package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.HotelStatus;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaHotelRepository extends JpaRepository<Hotel, Long> {
    List<Hotel> findByOwnerIdOrderByIdAsc(Long ownerId);
    List<Hotel> findByStatusOrderByIdAsc(HotelStatus status);
    long countByStatus(HotelStatus status);

    @Query("select distinct h.city from Hotel h where h.status = 'ACTIVE' order by h.city")
    List<String> activeCities();

    @Query("""
            select h from Hotel h
            where (:status is null or h.status = :status)
              and (:keyword is null or lower(h.name) like lower(concat('%', :keyword, '%')) or lower(h.city) like lower(concat('%', :keyword, '%')))
            order by h.id desc
            """)
    Page<Hotel> search(@Param("status") HotelStatus status, @Param("keyword") String keyword, Pageable pageable);
}
