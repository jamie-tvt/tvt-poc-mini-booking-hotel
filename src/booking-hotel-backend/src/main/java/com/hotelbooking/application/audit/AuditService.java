package com.hotelbooking.application.audit;

import com.hotelbooking.domain.audit.AuditLog;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.infrastructure.persistence.jpa.JpaAuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Nhật ký thao tác quan trọng: ai, lúc nào, làm gì, trên đối tượng nào, kết quả. */
@Service
public class AuditService {
    private final JpaAuditLogRepository repo;
    private final TimeProvider time;

    public AuditService(JpaAuditLogRepository repo, TimeProvider time) {
        this.repo = repo;
        this.time = time;
    }

    @Transactional
    public void log(Long actorId, String action, String entityType, Long entityId, String detail) {
        repo.save(new AuditLog(actorId, action, entityType, entityId, "SUCCESS", detail, time.now()));
    }

    /** Ghi cả khi giao dịch chính bị rollback (VD đăng nhập sai). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFailure(Long actorId, String action, String entityType, Long entityId, String detail) {
        repo.save(new AuditLog(actorId, action, entityType, entityId, "FAILED", detail, time.now()));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> list(Pageable pageable) { return repo.findAllByOrderByCreatedAtDesc(pageable); }
}
