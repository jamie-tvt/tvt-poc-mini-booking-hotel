package com.hotelbooking.application.hotel;

import com.hotelbooking.domain.hotel.Hotel;
import com.hotelbooking.domain.hotel.RoomType;
import com.hotelbooking.domain.inventory.Pricing;
import java.util.List;

/** Kết quả tính giá + tồn kho của một khách sạn cho một StayQuery (dùng cho tìm kiếm, chi tiết, portal). */
public record HotelOffer(Hotel hotel, Long fromPrice, Double ratingAverage, long ratingCount, int availableRoomTypes,
                         List<RoomTypeOffer> roomTypes) {

    /**
     * @param activeRooms    số phòng đang hoạt động
     * @param availableRooms số phòng còn trống cho MỌI đêm (null khi không truyền ngày)
     * @param listingPrice   giá niêm yết đêm đầu (không truyền ngày: tính từ giá cơ bản)
     * @param quote          báo giá cho số phòng tìm (null khi không truyền ngày)
     * @param eligible       đặt được: đủ sức chứa, đủ phòng mọi đêm, có đủ tiện nghi lọc
     */
    public record RoomTypeOffer(RoomType roomType, int activeRooms, Integer availableRooms, long listingPrice,
                                Pricing.Quote quote, boolean eligible) {}
}
