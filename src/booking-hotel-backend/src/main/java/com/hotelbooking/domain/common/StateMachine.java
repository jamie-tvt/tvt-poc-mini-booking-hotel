package com.hotelbooking.domain.common;

import java.util.Map;
import java.util.Set;

/** Bảng chuyển trạng thái dùng chung. Chuyển sai → 409 INVALID_TRANSITION. */
public final class StateMachine<S extends Enum<S>> {
    private final String entityName;
    private final Map<S, Set<S>> allowed;

    public StateMachine(String entityName, Map<S, Set<S>> allowed) {
        this.entityName = entityName;
        this.allowed = allowed;
    }

    public boolean can(S from, S to) {
        return allowed.getOrDefault(from, Set.of()).contains(to);
    }

    public void assertTransition(S from, S to) {
        if (!can(from, to)) {
            throw new BusinessException(ErrorCode.INVALID_TRANSITION,
                    entityName + " không thể chuyển từ " + from + " sang " + to);
        }
    }
}
