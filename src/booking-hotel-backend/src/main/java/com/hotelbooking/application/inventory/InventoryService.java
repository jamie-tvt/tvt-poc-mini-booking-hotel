package com.hotelbooking.application.inventory;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.inventory.RoomInventory;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomInventoryRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomRepository;
import com.hotelbooking.infrastructure.persistence.jpa.JpaRoomTypeRepository;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Tồn kho theo đêm (room_inventory). Thứ tự khoá thống nhất toàn hệ thống:
 * room_type (mutex số phòng) → room → inventory (stay_date tăng dần) → booking → payment.
 * Đi đúng thứ tự này thì các giao dịch chỉ xếp hàng chứ không deadlock lẫn nhau.
 */
@Service
public class InventoryService {
    private final JpaRoomInventoryRepository inventory;
    private final JpaRoomTypeRepository roomTypes;
    private final JpaRoomRepository rooms;
    private final TransactionTemplate newTx;

    public InventoryService(JpaRoomInventoryRepository inventory, JpaRoomTypeRepository roomTypes, JpaRoomRepository rooms,
                            PlatformTransactionManager txManager) {
        this.inventory = inventory;
        this.roomTypes = roomTypes;
        this.rooms = rooms;
        this.newTx = new TransactionTemplate(txManager);
        this.newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * Bảo đảm có đủ dòng tồn kho cho các đêm [from, to). Chạy trong giao dịch RIÊNG, ngắn, và phải gọi TRƯỚC
     * giao dịch đặt phòng: INSERT IGNORE giữ khoá S trên dòng trùng — nếu làm chung giao dịch rồi SELECT ... FOR UPDATE
     * ngay sau thì hai khách cùng nâng khoá S→X sẽ deadlock.
     */
    public void ensureNights(Long roomTypeId, LocalDate from, LocalDate to) {
        newTx.executeWithoutResult(s -> {
            Set<LocalDate> existing = new HashSet<>(inventory.existingDates(roomTypeId, from, to));
            if (existing.size() == from.datesUntil(to).count()) return;          // đường nhanh: đủ dòng, không khoá gì
            roomTypes.lockShared(roomTypeId).orElseThrow(() -> BusinessException.notFound("loại phòng"));
            for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
                if (!existing.contains(d)) inventory.insertIgnore(roomTypeId, d);
            }
        });
    }

    /** SELECT ... FOR UPDATE mọi đêm [from, to) theo ngày tăng dần. Thiếu đêm nào → ROOM_UNAVAILABLE. */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<RoomInventory> lockNights(Long roomTypeId, LocalDate from, LocalDate to) {
        List<RoomInventory> rows = inventory.lockRange(roomTypeId, from, to);
        if (rows.size() != from.datesUntil(to).count()) {
            throw new BusinessException(ErrorCode.ROOM_UNAVAILABLE, "Loại phòng chưa mở bán cho khoảng ngày này");
        }
        return rows;
    }

    /** Trả lại tồn kho các đêm từ releaseFrom trở đi (đêm đã qua giữ nguyên để báo cáo công suất đúng). */
    public static int release(List<RoomInventory> rows, int roomsCount, LocalDate releaseFrom) {
        int n = 0;
        for (RoomInventory r : rows) {
            if (!r.getStayDate().isBefore(releaseFrom)) { r.release(roomsCount); n++; }
        }
        return n;
    }

    /**
     * Số phòng active của loại phòng đã đổi → cập nhật total_rooms các đêm từ hôm nay. Người gọi PHẢI đang giữ
     * khoá X trên dòng room_types (lockForUpdate). Đêm nào đã bán nhiều hơn tổng mới → 409.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void syncTotals(Long roomTypeId, LocalDate today) {
        int active = rooms.countByRoomTypeIdAndActiveTrue(roomTypeId);
        for (RoomInventory r : inventory.lockFrom(roomTypeId, today)) r.changeTotal(active);
    }

    /** Giá riêng theo ngày cho các đêm [from, toInclusive]; price = null → bỏ giá riêng. */
    public int setPrices(Long roomTypeId, LocalDate from, LocalDate toInclusive, Long price) {
        LocalDate to = toInclusive.plusDays(1);
        ensureNights(roomTypeId, from, to);
        Integer n = newTx.execute(s -> {
            List<RoomInventory> rows = inventory.lockRange(roomTypeId, from, to);
            rows.forEach(r -> r.setPriceOverride(price));
            return rows.size();
        });
        return n == null ? 0 : n;
    }
}
