package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.inventory.RoomInventory;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaRoomInventoryRepository extends JpaRepository<RoomInventory, Long> {

    /**
     * Tạo dòng tồn kho còn thiếu cho một đêm. total_rooms = số phòng active tại thời điểm insert.
     * INSERT IGNORE: hai giao dịch cùng tạo một đêm → một dòng thắng, dòng kia bị bỏ qua nhờ UNIQUE(room_type_id, stay_date).
     */
    @Modifying
    @Query(value = """
            INSERT IGNORE INTO room_inventory (room_type_id, stay_date, total_rooms, booked_rooms)
            SELECT :rt, :d, COUNT(*), 0 FROM rooms WHERE room_type_id = :rt AND is_active = TRUE
            """, nativeQuery = true)
    int insertIgnore(@Param("rt") Long roomTypeId, @Param("d") LocalDate stayDate);

    @Query("select i.stayDate from RoomInventory i where i.roomTypeId = :rt and i.stayDate >= :from and i.stayDate < :to")
    List<LocalDate> existingDates(@Param("rt") Long roomTypeId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /** SELECT ... FOR UPDATE theo stay_date tăng dần — mọi luồng khoá cùng thứ tự nên không deadlock lẫn nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from RoomInventory i where i.roomTypeId = :rt and i.stayDate >= :from and i.stayDate < :to order by i.stayDate")
    List<RoomInventory> lockRange(@Param("rt") Long roomTypeId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from RoomInventory i where i.roomTypeId = :rt and i.stayDate >= :from order by i.stayDate")
    List<RoomInventory> lockFrom(@Param("rt") Long roomTypeId, @Param("from") LocalDate from);

    @Query("select i from RoomInventory i where i.roomTypeId in :ids and i.stayDate >= :from and i.stayDate < :to order by i.stayDate")
    List<RoomInventory> findRange(@Param("ids") Collection<Long> roomTypeIds, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("select coalesce(sum(i.bookedRooms), 0) from RoomInventory i, RoomType t where t.id = i.roomTypeId and t.active = true and t.hotel.status = 'ACTIVE' and i.stayDate = :d")
    long bookedOn(@Param("d") LocalDate date);
}
