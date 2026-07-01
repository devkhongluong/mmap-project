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

    @Value("${gemini.api-key}")
    private String apiKey;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiService(ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent")
                .build();
        this.objectMapper = objectMapper;
    }

    public String getFeedbackForNote(String noteContent) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key is not configured.");
            return "Tính năng nhận xét bằng AI hiện chưa được cấu hình API Key trên server. Vui lòng liên hệ quản trị viên.";
        }

        log.info("Calling Gemini API, key prefix: {}...", apiKey.length() > 6 ? apiKey.substring(0, 6) : "???");

        String prompt = "Bạn là một trợ lý AI giúp người dùng đánh giá ghi chú học tập của họ. " +
                "Hãy đọc ghi chú sau đây và đưa ra nhận xét ngắn gọn, khích lệ (tối đa 3-4 câu). " +
                "Ghi chú: \n" + noteContent;

        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", prompt)
                            ))
                    )
            );

            String responseStr = restClient.post()
                    .uri(uriBuilder -> uriBuilder.queryParam("key", apiKey).build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("Gemini raw response: {}", responseStr);

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
                log.error("Unexpected Gemini response structure: {}", responseStr);
                return "AI không thể đưa ra nhận xét lúc này. Vui lòng thử lại sau.";
            }

        } catch (RestClientResponseException ex) {
            // Gemini trả về lỗi HTTP (400 API key sai, 429 quota, v.v.)
            log.error("Gemini HTTP error {} — body: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            String body = ex.getResponseBodyAsString();
            if (body.contains("API_KEY_INVALID") || body.contains("API key not valid")) {
                return "API Key Gemini không hợp lệ. Vui lòng kiểm tra lại trong cài đặt Render.";
            } else if (body.contains("RESOURCE_EXHAUSTED") || body.contains("quota")) {
                return "API Gemini đang bị giới hạn (rate limit hoặc hết quota). Thử lại sau 1 phút nhé!";
            }
            return "Gemini API lỗi (" + ex.getStatusCode() + "): " + body;
        } catch (Exception e) {
            log.error("Unexpected error calling Gemini API", e);
            return "Có lỗi xảy ra khi kết nối tới AI: " + e.getMessage();
        }
    }
}
