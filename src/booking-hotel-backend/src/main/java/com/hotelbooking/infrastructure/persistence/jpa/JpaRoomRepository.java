package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.Room;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaRoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByRoomTypeIdOrderByRoomNumberAsc(Long roomTypeId);
    int countByRoomTypeIdAndActiveTrue(Long roomTypeId);
    boolean existsByHotelIdAndRoomNumber(Long hotelId, String roomNumber);

    /** [roomTypeId, số phòng active] cho nhiều loại phòng một lần (tìm kiếm). */
    @Query("select r.roomType.id, count(r) from Room r where r.roomType.id in :ids and r.active = true group by r.roomType.id")
    List<Object[]> countActiveByRoomType(@Param("ids") Collection<Long> roomTypeIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id in :ids order by r.id")
    List<Room> lockAll(@Param("ids") Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Room r where r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Long id);

    /** Phòng đang có khách (thuộc booking CHECKED_IN). */
    @Query("select r.id from Booking b join b.rooms r where b.status = 'CHECKED_IN' and r.id in :ids")
    List<Long> occupiedAmong(@Param("ids") Collection<Long> ids);

    @Query("select count(r) from Room r where r.active = true and r.roomType.active = true and r.roomType.hotel.status = 'ACTIVE'")
    long countSellable();
}
