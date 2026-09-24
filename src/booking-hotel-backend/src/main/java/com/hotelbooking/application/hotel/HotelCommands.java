package com.hotelbooking.application.hotel;

import com.hotelbooking.domain.hotel.CancellationPolicy;
import java.util.List;

public final class HotelCommands {
    private HotelCommands() {}

    public record HotelCommand(String name, String city, String address, String description, int starRating, String phone,
                               String checkInTime, String checkOutTime, String coverImageUrl) {}

    public record RoomTypeCommand(String name, String description, int capacity, String bedInfo, int areaM2, long basePrice,
                                  CancellationPolicy cancellationPolicy, Integer freeCancelDays, String imageUrl, List<Long> facilityIds) {}
}
