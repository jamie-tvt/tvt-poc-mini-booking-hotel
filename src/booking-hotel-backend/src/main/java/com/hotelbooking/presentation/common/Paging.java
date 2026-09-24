package com.hotelbooking.presentation.common;

import org.springframework.data.domain.PageRequest;

public final class Paging {
    private Paging() {}

    public static PageRequest of(Integer page, Integer size) {
        int p = page == null || page < 0 ? 0 : page;
        int s = size == null || size < 1 ? 12 : Math.min(size, 100);
        return PageRequest.of(p, s);
    }
}
