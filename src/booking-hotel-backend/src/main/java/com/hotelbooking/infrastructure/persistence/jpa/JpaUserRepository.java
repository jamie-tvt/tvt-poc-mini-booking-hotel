package com.hotelbooking.infrastructure.persistence.jpa;

import com.hotelbooking.domain.user.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JpaUserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    @Query("select u from User u where u.role.name = :role order by u.id")
    List<User> findByRoleName(@Param("role") String role);

    @Query("select u from User u where u.hotelId = :hotelId and u.role.name = 'HOTEL_STAFF' order by u.fullName")
    List<User> findStaffOfHotel(@Param("hotelId") Long hotelId);

    @Query("""
            select u from User u
            where (:keyword is null or lower(u.fullName) like lower(concat('%', :keyword, '%')) or lower(u.email) like lower(concat('%', :keyword, '%')))
              and (:role is null or u.role.name = :role)
            order by u.id desc
            """)
    Page<User> search(@Param("keyword") String keyword, @Param("role") String role, Pageable pageable);
}
