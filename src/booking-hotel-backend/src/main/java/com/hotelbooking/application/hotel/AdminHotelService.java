package com.hotelbooking.application.hotel;

import com.hotelbooking.application.audit.AuditService;
import com.hotelbooking.application.notification.NotificationService;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.HotelStatus;
import com.hotelbooking.infrastructure.persistence.jpa.JpaHotelRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-HTL-002: admin duyệt / từ chối / tạm ngưng / mở lại khách sạn. Chuyển sai trạng thái → 409 INVALID_TRANSITION. */
@Service
public class AdminHotelService {
    private final JpaHotelRepository hotels;
    private final NotificationService notifications;
    private final AuditService audit;
    private final TimeProvider time;

    public AdminHotelService(JpaHotelRepository hotels, NotificationService notifications, AuditService audit, TimeProvider time) {
        this.hotels = hotels;
        this.notifications = notifications;
        this.audit = audit;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public Page<Hotel> search(HotelStatus status, String keyword, Pageable pageable) {
        return hotels.search(status, keyword == null || keyword.isBlank() ? null : keyword.trim(), pageable);
    }

    @Transactional(readOnly = true)
    public Hotel get(Long id) { return hotels.findById(id).orElseThrow(() -> BusinessException.notFound("khách sạn")); }

    @Transactional
    public Hotel approve(Long id, Long adminId) {
        return change(id, adminId, HotelStatus.ACTIVE, "APPROVE", "Khách sạn đã được duyệt", "đã hiển thị với khách hàng.");
    }

    @Transactional
    public Hotel reject(Long id, Long adminId, String reason) {
        Hotel h = get(id);
        h.reject(reason.trim(), time.now());
        notifications.notify(h.getOwnerId(), null, "Khách sạn chưa được duyệt", h.getName() + ": " + reason.trim() + ". Sửa hồ sơ để gửi duyệt lại.");
        audit.log(adminId, "REJECT", "hotel", id, reason);
        return h;
    }

    @Transactional
    public Hotel suspend(Long id, Long adminId) {
        return change(id, adminId, HotelStatus.SUSPENDED, "SUSPEND", "Khách sạn bị tạm ngưng", "tạm ẩn khỏi tìm kiếm. Liên hệ quản trị viên.");
    }

    @Transactional
    public Hotel activate(Long id, Long adminId) {
        return change(id, adminId, HotelStatus.ACTIVE, "ACTIVATE", "Khách sạn hoạt động trở lại", "đã hiển thị lại với khách hàng.");
    }

    private Hotel change(Long id, Long adminId, HotelStatus next, String action, String title, String tail) {
        Hotel h = get(id);
        h.changeStatus(next, time.now());
        notifications.notify(h.getOwnerId(), null, title, h.getName() + " " + tail);
        audit.log(adminId, action, "hotel", id, h.getName());
        return h;
    }
}
