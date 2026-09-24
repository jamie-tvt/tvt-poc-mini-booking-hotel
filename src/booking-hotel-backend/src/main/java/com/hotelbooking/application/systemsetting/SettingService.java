package com.hotelbooking.application.systemsetting;

import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.common.TimeProvider;
import com.hotelbooking.domain.systemsetting.SystemSetting;
import com.hotelbooking.infrastructure.persistence.jpa.JpaSystemSettingRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tham số nghiệp vụ đổi được lúc chạy (FR-FEE). Mọi giá trị đều là số nguyên. */
@Service
public class SettingService {
    public static final String FEE_PERCENT = "platform.fee_percent";
    public static final String PAYMENT_TIMEOUT = "booking.payment_timeout_minutes";

    private static final Map<String, int[]> RANGES = Map.of(
            FEE_PERCENT, new int[] {0, 50}, PAYMENT_TIMEOUT, new int[] {1, 1440});

    private final JpaSystemSettingRepository repo;
    private final TimeProvider time;

    public SettingService(JpaSystemSettingRepository repo, TimeProvider time) {
        this.repo = repo;
        this.time = time;
    }

    @Transactional(readOnly = true)
    public int getInt(String key, int fallback) {
        return repo.findByKey(key).map(s -> {
            try { return Integer.parseInt(s.getValue().trim()); } catch (RuntimeException e) { return fallback; }
        }).orElse(fallback);
    }

    public int feePercent() { return getInt(FEE_PERCENT, 10); }
    public Duration paymentTimeout() { return Duration.ofMinutes(getInt(PAYMENT_TIMEOUT, 15)); }

    @Transactional(readOnly = true)
    public List<SystemSetting> list() { return repo.findAllByOrderByKeyAsc(); }

    @Transactional
    public void update(Map<String, String> values, Long actorId) {
        values.forEach((key, value) -> {
            SystemSetting s = repo.findByKey(key).orElseThrow(() -> BusinessException.notFound("tham số " + key));
            int v;
            try { v = Integer.parseInt(value.trim()); }
            catch (RuntimeException e) { throw new BusinessException(ErrorCode.BAD_REQUEST, key + " phải là số nguyên"); }
            int[] r = RANGES.getOrDefault(key, new int[] {Integer.MIN_VALUE, Integer.MAX_VALUE});
            if (v < r[0] || v > r[1]) throw new BusinessException(ErrorCode.BAD_REQUEST, key + " phải nằm trong khoảng " + r[0] + "–" + r[1]);
            s.update(String.valueOf(v), actorId, time.now());
        });
    }
}
