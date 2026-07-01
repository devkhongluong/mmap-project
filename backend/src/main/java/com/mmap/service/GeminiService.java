package com.mmap.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${groq.api-key:}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiService(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.groq.com/openai/v1/chat/completions")
                .build();
        this.objectMapper = objectMapper;
    }

    public String getFeedbackForNote(String noteContent) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Groq API key is not configured.");
            return "Tính năng nhận xét bằng AI hiện chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
        }

        log.info("Calling Groq API...");

        String prompt = "Bạn là một trợ lý AI giúp người dùng đánh giá ghi chú học tập của họ. " +
                "Hãy đọc ghi chú sau đây và đưa ra nhận xét ngắn gọn, khích lệ (tối đa 3-4 câu bằng tiếng Việt). " +
                "Ghi chú: \n" + noteContent;

        try {
            // Groq dùng OpenAI-compatible format
            Map<String, Object> requestBody = Map.of(
                    "model", "llama-3.3-70b-versatile",
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)
                    ),
                    "max_tokens", 300,
                    "temperature", 0.7
            );

            String responseStr = restClient.post()
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("Groq response received successfully");

            // Parse OpenAI-compatible response: choices[0].message.content
            JsonNode rootNode = objectMapper.readTree(responseStr);
            JsonNode textNode = rootNode
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content");

            if (!textNode.isMissingNode()) {
                return textNode.asText().trim();
            } else {
                log.error("Unexpected Groq response structure: {}", responseStr);
                return "AI không thể đưa ra nhận xét lúc này. Vui lòng thử lại sau.";
            }

        } catch (RestClientResponseException ex) {
            log.error("Groq HTTP error {} — body: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            String body = ex.getResponseBodyAsString();
            if (body.contains("invalid_api_key") || body.contains("401")) {
                return "API Key Groq không hợp lệ. Vui lòng kiểm tra lại trong cài đặt Render.";
            } else if (body.contains("rate_limit") || body.contains("429")) {
                return "Groq đang bị rate limit. Thử lại sau 1 phút nhé!";
            }
            return "Groq API lỗi (" + ex.getStatusCode() + "): " + body;
        } catch (Exception e) {
            log.error("Unexpected error calling Groq API", e);
            return "Có lỗi xảy ra khi kết nối tới AI: " + e.getMessage();
        }
    }
}
