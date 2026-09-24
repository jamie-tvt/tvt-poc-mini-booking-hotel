package com.hotelbooking.application.hotel;

import com.hotelbooking.domain.common.BusinessException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Khoảng lưu trú + số khách/phòng của một lần tìm kiếm. checkIn/checkOut có thể cùng null (không lọc theo ngày). */
public record StayQuery(LocalDate checkIn, LocalDate checkOut, int guests, int rooms) {
    public static final int MAX_NIGHTS = 30;
    public static final int MAX_ROOMS = 5;

    public static StayQuery none() { return new StayQuery(null, null, 1, 1); }

    public boolean hasDates() { return checkIn != null; }

    public int nights() { return hasDates() ? (int) ChronoUnit.DAYS.between(checkIn, checkOut) : 0; }

    /** Lỗi khoảng ngày → 400 theo hợp đồng §5.2. */
    public static StayQuery of(LocalDate checkIn, LocalDate checkOut, Integer guests, Integer rooms, LocalDate today) {
        int g = guests == null ? 1 : guests;
        int r = rooms == null ? 1 : rooms;
        if (g < 1 || g > 100) throw BusinessException.badRequest("Số khách không hợp lệ");
        if (r < 1 || r > MAX_ROOMS) throw BusinessException.badRequest("Số phòng từ 1 đến " + MAX_ROOMS);
        if ((checkIn == null) != (checkOut == null)) throw BusinessException.badRequest("Cần chọn cả ngày nhận và ngày trả phòng");
        if (checkIn != null) validateDates(checkIn, checkOut, today);
        return new StayQuery(checkIn, checkOut, g, r);
    }

    public static void validateDates(LocalDate checkIn, LocalDate checkOut, LocalDate today) {
        if (checkIn == null || checkOut == null) throw BusinessException.badRequest("Cần chọn cả ngày nhận và ngày trả phòng");
        if (!checkOut.isAfter(checkIn)) throw BusinessException.badRequest("Ngày trả phòng phải sau ngày nhận phòng");
        if (checkIn.isBefore(today)) throw BusinessException.badRequest("Ngày nhận phòng không được ở quá khứ");
        if (ChronoUnit.DAYS.between(checkIn, checkOut) > MAX_NIGHTS) throw BusinessException.badRequest("Mỗi lần đặt tối đa " + MAX_NIGHTS + " đêm");
    }
}
