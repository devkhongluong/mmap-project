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
     */
    public String askVoiceQuestion(String question, String dayTitle, String phaseName,
                                   java.util.List<String> checklistItems,
                                   java.util.List<java.util.Map<String, String>> materials,
                                   String userApiKey) {
        String effectiveKey = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : apiKey;
        if (effectiveKey == null || effectiveKey.isBlank()) {
            return "Chưa cài Groq API key. Vào Cài đặt → nhập key miễn phí tại console.groq.com để dùng tính năng này.";
        }

        String checklistStr = (checklistItems == null || checklistItems.isEmpty())
                ? "(không có checklist)"
                : String.join("\n- ", checklistItems);

        StringBuilder materialsBuilder = new StringBuilder();
        if (materials != null && !materials.isEmpty()) {
            for (java.util.Map<String, String> mat : materials) {
                String title = mat.getOrDefault("title", "");
                String type = mat.getOrDefault("contentType", "");
                String content = mat.getOrDefault("content", "");
                materialsBuilder.append("\n- ").append(title);
                if ("link".equalsIgnoreCase(type) || "youtube".equalsIgnoreCase(type)) {
                    materialsBuilder.append(" (Link: ").append(content).append(")");
                } else if ("text".equalsIgnoreCase(type)) {
                    materialsBuilder.append(":\n  ").append(content);
                }
            }
        } else {
            materialsBuilder.append(" (Không có tài liệu)");
        }

        String systemPrompt = String.format(
                "Bạn là trợ lý học tập thông minh của MMAP, thân thiện, trả lời chính xác dựa trên bài học.\n" +
                "Người dùng đang học: %s (Giai đoạn: %s)\n" +
                "Nội dung checklist:\n- %s\n" +
                "Tài liệu & Bài học & Link tham khảo hôm nay:%s\n\n" +
                "Quy tắc trả lời:\n" +
                "- Dựa trực tiếp vào danh sách tài liệu, bài học, link tham khảo được cung cấp ở trên để hướng dẫn người dùng khi được hỏi về bài học/đề thi/tài liệu.\n" +
                "- Trả lời ngắn gọn (2-4 câu), đi thẳng vào trọng tâm.\n" +
                "- Tiếng Việt, giữ tiếng Anh cho thuật ngữ kỹ thuật.\n" +
                "- Không chào hỏi, không lặp lại câu hỏi.",
                dayTitle != null ? dayTitle : "Chưa xác định",
                phaseName != null ? phaseName : "Chưa xác định",
                checklistStr,
                materialsBuilder.toString()
        );

        log.info("Voice chat: user asked '{}'", question.length() > 50 ? question.substring(0, 50) + "..." : question);
        return callGroq("llama-3.1-8b-instant", systemPrompt, question, 300, effectiveKey);
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

