package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.hotel.RoomType;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaRoomTypeRepository extends JpaRepository<RoomType, Long> {
    List<RoomType> findByHotelIdAndActiveTrueOrderByIdAsc(Long hotelId);
    List<RoomType> findByHotelIdInAndActiveTrueOrderByIdAsc(Collection<Long> hotelIds);

    /**
     * Dòng room_types làm "mutex" cho số phòng: thêm/tắt phòng giữ khoá X, tạo dòng tồn kho giữ khoá S
     * → total_rooms của đêm mới tạo không bao giờ đếm theo số phòng cũ.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from RoomType t where t.id = :id")
    Optional<RoomType> lockForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select t from RoomType t where t.id = :id")
    Optional<RoomType> lockShared(@Param("id") Long id);
}
