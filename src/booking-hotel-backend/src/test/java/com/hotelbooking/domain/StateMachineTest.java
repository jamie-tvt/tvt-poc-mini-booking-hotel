package com.hotelbooking.domain;

import static org.assertj.core.api.Assertions.*;

import com.hotelbooking.domain.booking.BookingStatus;
import com.hotelbooking.domain.common.BusinessException;
import com.hotelbooking.domain.common.ErrorCode;
import com.hotelbooking.domain.hotel.HotelStatus;
import com.hotelbooking.domain.payment.PaymentStatus;
import com.hotelbooking.domain.payout.PayoutStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Bảng chuyển trạng thái theo §3 hợp đồng. */
class StateMachineTest {

    @ParameterizedTest
    @CsvSource({"PENDING,CONFIRMED,true", "PENDING,CANCELLED,true", "PENDING,EXPIRED,true",
            "CONFIRMED,CHECKED_IN,true", "CONFIRMED,CANCELLED,true", "CONFIRMED,NO_SHOW,true", "CHECKED_IN,CHECKED_OUT,true",
            "PENDING,CHECKED_IN,false", "PENDING,NO_SHOW,false", "CONFIRMED,EXPIRED,false", "CONFIRMED,CHECKED_OUT,false",
            "CHECKED_IN,CANCELLED,false", "CHECKED_OUT,CANCELLED,false", "EXPIRED,CONFIRMED,false", "CANCELLED,CONFIRMED,false",
            "NO_SHOW,CHECKED_IN,false"})
    void booking_transitions(BookingStatus from, BookingStatus to, boolean allowed) {
        assertThat(BookingStatus.MACHINE.can(from, to)).isEqualTo(allowed);
    }

    @ParameterizedTest
    @CsvSource({"PENDING_APPROVAL,ACTIVE,true", "PENDING_APPROVAL,REJECTED,true", "ACTIVE,SUSPENDED,true", "SUSPENDED,ACTIVE,true",
            "REJECTED,PENDING_APPROVAL,true", "PENDING_APPROVAL,SUSPENDED,false", "REJECTED,ACTIVE,false", "ACTIVE,REJECTED,false",
            "ACTIVE,PENDING_APPROVAL,false", "SUSPENDED,REJECTED,false"})
    void hotel_transitions(HotelStatus from, HotelStatus to, boolean allowed) {
        assertThat(HotelStatus.MACHINE.can(from, to)).isEqualTo(allowed);
    }

    @Test
    void paid_payment_can_only_be_refunded() {
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.REFUNDED)).isTrue();
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.FAILED)).isFalse();
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.PAID, PaymentStatus.CANCELLED)).isFalse();
        assertThat(PaymentStatus.MACHINE.can(PaymentStatus.FAILED, PaymentStatus.PAID)).isFalse();
    }

    @Test
    void payout_is_paid_once() {
        assertThat(PayoutStatus.MACHINE.can(PayoutStatus.PENDING, PayoutStatus.PAID)).isTrue();
        assertThatThrownBy(() -> PayoutStatus.MACHINE.assertTransition(PayoutStatus.PAID, PayoutStatus.PAID))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.INVALID_TRANSITION));
    }

    @Test
    void invalid_transition_is_409() {
        assertThatThrownBy(() -> BookingStatus.MACHINE.assertTransition(BookingStatus.CHECKED_OUT, BookingStatus.CHECKED_IN))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code().httpStatus()).isEqualTo(409));
    }
}
