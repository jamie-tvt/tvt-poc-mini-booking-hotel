package com.hotelbooking.presentation.common;

import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.hotel.CancellationPolicy;
import com.hotelbooking.domain.hotel.HotelStatus;
import com.hotelbooking.domain.payment.PaymentProvider;
import com.hotelbooking.domain.payment.PaymentStatus;
import com.hotelbooking.domain.payout.PayoutStatus;
import com.hotelbooking.domain.review.ReviewStatus;
import com.hotelbooking.domain.user.Role;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Response DTO — khớp §4 của docs/technical/api-contracts.md. Trường null bị bỏ khỏi JSON (non_null). */
public final class Dtos {
    private Dtos() {}

    public record UserDto(Long id, String fullName, String email, String phone, Role role, Long hotelId, String hotelName,
                          boolean active, Instant createdAt) {}
    public record AuthTokensDto(String accessToken, String refreshToken, long expiresIn, UserDto user) {}

    public record FacilityDto(Long id, String name, String icon, Long categoryId, String categoryName) {}
    public record FacilityCategoryDto(Long id, String name, List<FacilityDto> facilities) {}

    public record HotelSummaryDto(Long id, String name, String city, String address, int starRating, String coverImageUrl,
                                  HotelStatus status, Long fromPrice, Double ratingAverage, long ratingCount, int availableRoomTypes,
                                  String ownerName, String rejectReason) {}

    public record NightlyPriceDto(LocalDate date, long basePrice, long listingPrice) {}

    public record RoomTypeDto(Long id, Long hotelId, String name, String description, int capacity, String bedInfo, int areaM2,
                              long basePrice, long listingPrice, int totalRooms, CancellationPolicy cancellationPolicy,
                              Integer freeCancelDays, String imageUrl, List<FacilityDto> facilities, Integer availableRooms,
                              List<NightlyPriceDto> nightlyPrices, Long stayTotal) {}

    public record HotelDetailDto(Long id, String name, String city, String address, int starRating, String coverImageUrl,
                                 HotelStatus status, Long fromPrice, Double ratingAverage, long ratingCount, int availableRoomTypes,
                                 String ownerName, String rejectReason, String description, String checkInTime, String checkOutTime,
                                 String phone, List<String> images, List<RoomTypeDto> roomTypes, List<FacilityDto> facilities) {}

    public record RoomDto(Long id, Long roomTypeId, String roomTypeName, String roomNumber, boolean active, boolean occupied) {}

    public record RefundPreviewDto(int percent, long amount) {}

    public record BookingDto(Long id, String bookingCode, String accessKey, BookingStatus status, Long hotelId, String hotelName,
                             String hotelCity, String hotelCoverImageUrl, Long roomTypeId, String roomTypeName, String roomNumber,
                             LocalDate checkIn, LocalDate checkOut, int nights, int roomsCount, int guests, String guestName,
                             String guestEmail, String guestPhone, String note, long baseAmount, long feeAmount, long totalAmount,
                             Instant bookedAt, Instant expiresAt, Instant cancelledAt, String cancelReason, Instant checkedInAt,
                             Instant checkedOutAt, CancellationPolicy cancellationPolicy, Integer freeCancelDays,
                             PaymentStatus paymentStatus, InvoiceDto invoice, boolean canPay, boolean canCancel, boolean canReview,
                             RefundPreviewDto refundPreview) {}

    public record InvoiceDto(Long id, String invoiceCode, long amount, long baseAmount, long feeAmount, Instant createdAt,
                             List<PaymentDto> payments) {}

    public record PaymentDto(Long id, String bookingCode, long amount, Long refundAmount, PaymentStatus status, PaymentProvider provider,
                             String transactionCode, Instant createdAt, Instant paidAt, String checkoutUrl, String guestName, String note) {}

    public record ReviewDto(Long id, Long hotelId, String bookingCode, String guestName, int rating, String content,
                            ReviewStatus status, Instant createdAt) {}

    public record PayoutDto(Long id, Long hotelId, String hotelName, String bookingCode, long amount, PayoutStatus status,
                            Instant createdAt, Instant paidAt) {}

    public record NotificationDto(Long id, String title, String content, String bookingCode, boolean read, Instant createdAt) {}
    public record SettingDto(String key, String value, String description) {}
    public record AuditLogDto(Long id, String userEmail, String action, String entityType, Long entityId, String result, String detail, Instant createdAt) {}
}
