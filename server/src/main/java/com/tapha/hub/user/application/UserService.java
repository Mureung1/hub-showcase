package com.tapha.hub.user.application;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tapha.hub.user.domain.User;
import com.tapha.hub.user.domain.UserRepository;
import com.tapha.hub.user.presentation.CreateUserRequest;
import com.tapha.hub.user.presentation.UserResponse;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String nickname = request.nickname().trim();
        User user = userRepository.save(new User(nickname, Instant.now()));

        return UserResponse.from(user);
    }
}
