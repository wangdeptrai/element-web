/*
Copyright 2026 thehegeo

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

/**
 * Hợp đồng (contract) giữa Element (UI) và bot OpenClaw (VPS) cho tính năng nút Stop.
 *
 * CẢ HAI PHÍA PHẢI DÙNG ĐÚNG CÁC CHUỖI DƯỚI ĐÂY thì tính năng mới khớp nhau.
 * Đây chính là nội dung cần đưa cho người làm bot ở Giai đoạn 2.
 */

/**
 * Cờ đặt trong `content` của tin nhắn mà bot đang stream.
 * - Bot đặt `true` khi bắt đầu trả lời (trên tin placeholder).
 * - Bot gỡ đi (hoặc để `false`) khi trả lời xong / bị hủy.
 * UI dựa vào cờ này để biết bot có đang sinh câu trả lời hay không.
 */
export const AI_STREAMING_KEY = "com.thehegeo.ai.streaming";

/**
 * Loại event UI gửi vào room để yêu cầu bot hủy câu trả lời đang sinh.
 * Content: `{ "m.relates_to": { event_id: <id tin đang stream> } }`.
 * Bot lắng nghe event này, lấy `event_id` để tìm đúng job và abort.
 */
export const AI_CANCEL_EVENT_TYPE = "com.thehegeo.ai.cancel";
