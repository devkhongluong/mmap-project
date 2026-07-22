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

        return callGroq("llama-3.3-70b-versatile", null, prompt, 300, apiKey);
    }

    /**
     * Trả lời câu hỏi giọng nói từ người học.
     * Dùng llama-3.1-8b-instant (nhanh hơn 70b ~3x, phù hợp real-time).
     *
     * @param question    Câu hỏi của user (đã chuyển từ voice → text)
     * @param dayTitle    Tiêu đề ngày học hiện tại
     * @param phaseName   Tên giai đoạn học
     * @param checklistItems  Danh sách checklist của ngày
     * @param userApiKey  Key riêng của user — null/blank → dùng server key
     */
    public String askVoiceQuestion(String question, String dayTitle, String phaseName,
                                   java.util.List<String> checklistItems, String userApiKey) {
        String effectiveKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : apiKey;
        if (effectiveKey == null || effectiveKey.isBlank()) {
            return "Chưa cài Groq API key. Vào Cài đặt → nhập key miễn phí tại console.groq.com để dùng tính năng này.";
        }

        String checklistStr = (checklistItems == null || checklistItems.isEmpty())
                ? "(không có checklist)"
                : String.join("\n- ", checklistItems);

        String systemPrompt = String.format(
                "Bạn là trợ lý học tập thông minh của MMAP, thân thiện và ngắn gọn.\n" +
                "Người dùng đang học: %s (Giai đoạn: %s)\n" +
                "Nội dung hôm nay:\n- %s\n\n" +
                "Quy tắc trả lời:\n" +
                "- Ngắn gọn 2-4 câu, đi thẳng vào trọng tâm\n" +
                "- Tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh\n" +
                "- Nếu hỏi nghĩa từ tiếng Anh: giải thích + 1 ví dụ câu\n" +
                "- Không chào hỏi, không lặp lại câu hỏi",
                dayTitle != null ? dayTitle : "Chưa xác định",
                phaseName != null ? phaseName : "Chưa xác định",
                checklistStr
        );

        log.info("Voice chat: user asked '{}'", question.length() > 50 ? question.substring(0, 50) + "..." : question);
        return callGroq("llama-3.1-8b-instant", systemPrompt, question, 250, effectiveKey);
    }

    // ── Internal helper ──────────────────────────────────────────────────────

    private String callGroq(String model, String systemPrompt, String userMessage,
                            int maxTokens, String key) {
        try {
            java.util.List<java.util.Map<String, String>> messages = new java.util.ArrayList<>();
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                messages.add(java.util.Map.of("role", "system", "content", systemPrompt));
            }
            messages.add(java.util.Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "messages", messages,
                    "max_tokens", maxTokens,
                    "temperature", 0.7
            );

            String responseStr = restClient.post()
                    .header("Authorization", "Bearer " + key)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode textNode = objectMapper.readTree(responseStr)
                    .path("choices").path(0).path("message").path("content");

            if (!textNode.isMissingNode()) {
                return textNode.asText().trim();
            }
            log.error("Unexpected Groq response structure");
            return "AI không thể trả lời lúc này. Vui lòng thử lại.";

        } catch (org.springframework.web.client.RestClientResponseException ex) {
            log.error("Groq HTTP error {} — body: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            String body = ex.getResponseBodyAsString();
            if (body.contains("invalid_api_key") || body.contains("401"))
                return "API Key Groq không hợp lệ. Vui lòng kiểm tra lại trong Cài đặt.";
            if (body.contains("rate_limit") || body.contains("429"))
                return "Groq đang bị rate limit. Thử lại sau 1 phút nhé!";
            return "Groq API lỗi (" + ex.getStatusCode() + ")";
        } catch (Exception e) {
            log.error("Unexpected error calling Groq API", e);
            return "Có lỗi xảy ra: " + e.getMessage();
        }
    }
}

