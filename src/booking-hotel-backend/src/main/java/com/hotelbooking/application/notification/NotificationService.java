package com.hotelbooking.application.notification;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.notification.Notification;
import com.hotelbooking.infrastructure.persistence.jpa.JpaNotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Thông báo trong ứng dụng cho người dùng đăng nhập. Khách vãng lai xem trạng thái ở màn đơn (email là adapter mức 3). */
@Service
public class NotificationService {
    private final JpaNotificationRepository repo;
    private final TimeProvider time;

    public NotificationService(JpaNotificationRepository repo, TimeProvider time) {
        this.repo = repo;
        this.time = time;
    }

    @Transactional
    public void notify(Long userId, Long bookingId, String title, String content) {
        repo.save(new Notification(userId, bookingId, title, content, time.now()));
    }

    @Transactional(readOnly = true)
    public Page<Notification> list(Long userId, Pageable pageable) { return repo.findByUserIdOrderByCreatedAtDesc(userId, pageable); }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) { return repo.countByUserIdAndReadFalse(userId); }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repo.findById(id).filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> BusinessException.notFound("thông báo"));
        n.markRead();
    }

    @Transactional
    public void markAllRead(Long userId) { repo.markAllRead(userId); }
}
