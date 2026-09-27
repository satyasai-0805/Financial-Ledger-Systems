package com.ledger.controller;

import com.ledger.dto.ChatRequest;
import com.ledger.dto.ChatResponse;
import com.ledger.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    @Autowired
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/ask")
    public ResponseEntity<ChatResponse> askChatbot(@RequestBody ChatRequest request, Principal principal, Authentication authentication) {
        String username = "anonymous";
        if (principal != null) {
            username = principal.getName();
        } else if (authentication != null) {
            username = authentication.getName();
        }

        ChatResponse response = chatService.processChatRequest(username, request.getMessage());
        
        if (response.getError() != null && response.getError().contains("Rate limit")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(response);
        }
        
        return ResponseEntity.ok(response);
    }
}
