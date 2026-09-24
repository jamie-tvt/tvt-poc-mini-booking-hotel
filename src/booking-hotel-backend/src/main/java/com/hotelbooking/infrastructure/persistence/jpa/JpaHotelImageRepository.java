package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.HotelImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaHotelImageRepository extends JpaRepository<HotelImage, Long> {
    List<HotelImage> findByHotelIdOrderBySortOrderAsc(Long hotelId);
}
