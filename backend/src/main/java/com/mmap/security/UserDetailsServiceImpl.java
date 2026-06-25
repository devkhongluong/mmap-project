package com.mmap.security;

import com.mmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Tích hợp UserDetailsService với database — dùng email làm username.
 * Spring Security gọi loadUserByUsername() khi xác thực.
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Load user bằng email (chúng ta dùng email làm username trong JWT).
     *
     * @param email email của user
     * @return UserDetails cho Spring Security
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        com.mmap.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy user với email: " + email));

        // Tất cả user có ROLE_USER — có thể mở rộng sau
        return User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of())         // Không dùng role-based auth phức tạp
                .build();
    }
}
