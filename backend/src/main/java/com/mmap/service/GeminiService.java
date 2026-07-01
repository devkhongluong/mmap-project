package com.mmap.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiService {

    @Value("${gemini.api-key}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiService(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent")
                .build();
        this.objectMapper = objectMapper;
    }

    public String getFeedbackForNote(String noteContent) {
        if (apiKey == null || apiKey.isBlank() || "YOUR_GEMINI_API_KEY".equals(apiKey)) {
            log.warn("Gemini API key is not configured.");
            return "Tính năng nhận xét bằng AI hiện chưa được cấu hình API Key trên server. Vui lòng liên hệ quản trị viên.";
        }

        String prompt = "Bạn là một trợ lý AI giúp người dùng đánh giá ghi chú học tập của họ. " +
                "Hãy đọc ghi chú sau đây và đưa ra nhận xét ngắn gọn, khích lệ (tối đa 3-4 câu). " +
                "Ghi chú: \n" + noteContent;

        try {
            // Chuẩn bị payload JSON cho Gemini API
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt)
                            ))
                    )
            );

            // Gọi API
            String responseStr = restClient.post()
                    .uri(uriBuilder -> uriBuilder.queryParam("key", apiKey).build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // Parse kết quả
            JsonNode rootNode = objectMapper.readTree(responseStr);
            JsonNode textNode = rootNode
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text");

            if (!textNode.isMissingNode()) {
                return textNode.asText().trim();
            } else {
                log.error("Invalid response from Gemini: {}", responseStr);
                return "AI không thể đưa ra nhận xét lúc này. Vui lòng thử lại sau.";
            }

        } catch (Exception e) {
            log.error("Error calling Gemini API", e);
            return "Có lỗi xảy ra khi kết nối tới AI. Vui lòng thử lại sau.";
        }
    }
}
