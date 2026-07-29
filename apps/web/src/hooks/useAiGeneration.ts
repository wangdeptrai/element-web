/*
Copyright 2026 thehegeo

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useCallback, useEffect, useState } from "react";
import { type MatrixEvent, type Room, RoomEvent, RoomMemberEvent, EventType, RelationType, MatrixEventEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { AI_CANCEL_EVENT_TYPE, AI_STREAMING_KEY } from "../ai/aiEvents";

interface AiGenerationState {
    /** Bot có đang sinh câu trả lời trong room này không. */
    isGenerating: boolean;
    /** event_id của tin nhắn đang được stream (dùng để gửi tín hiệu hủy). */
    streamingEventId?: string;
}

// Lưu vết các tin nhắn đã gửi lệnh hủy để không kích hoạt lại trạng thái generating
const abortedEventIds = new Set<string>();
// Lưu vết ID các tin nhắn do Bot sinh ra
const aiMessageIds = new Set<string>();
// Lưu giữ nội dung mới nhất của các tin nhắn AI để khôi phục khi VPS gửi lệnh redact (tránh hiện "Message deleted")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const savedAiContentMap = new Map<string, any>();

function trackAiContent(ev: MatrixEvent | undefined, room?: Room): void {
    if (!ev || ev.getType() !== EventType.RoomMessage) return;
    const content = ev.getContent();
    if (content && typeof content.body === "string" && content.body.trim().length > 0) {
        const myUserId = room?.client?.getUserId();
        const isBotMessage = Boolean(ev.getSender() && myUserId && ev.getSender() !== myUserId);
        if (content[AI_STREAMING_KEY] === true || (ev.getId() && (aiMessageIds.has(ev.getId()!) || abortedEventIds.has(ev.getId()!))) || isBotMessage) {
            if (ev.getId()) {
                aiMessageIds.add(ev.getId()!);
                savedAiContentMap.set(ev.getId()!, { ...content });
            }
        }
    }
}

/**
 * Tìm tin nhắn mới nhất trong room còn mang cờ streaming.
 *
 * Lưu ý: `getContent()` của matrix-js-sdk tự trả về nội dung của bản edit mới
 * nhất, nên khi bot gỡ cờ ở lần edit cuối (báo đã xong) thì hàm này không còn
 * thấy cờ nữa — đúng như mong muốn.
 */
function findStreamingEvent(room: Room): MatrixEvent | undefined {
    const events = room.getLiveTimeline().getEvents();
    for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.getType() !== EventType.RoomMessage) continue;
        trackAiContent(ev, room);
        if (ev.getContent()?.[AI_STREAMING_KEY] === true) return ev;
    }
    return undefined;
}

/**
 * Tìm tin nhắn hội thoại hợp lệ mới nhất trong room (bỏ qua lệnh /stop và thông báo lỗi abort ngắn).
 */
function findLatestValidMessage(room: Room): MatrixEvent | undefined {
    const events = room.getLiveTimeline().getEvents();
    for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.getType() !== EventType.RoomMessage || ev.isRedacted() || ev.isRelation(RelationType.Replace)) {
            continue;
        }
        trackAiContent(ev, room);
        const content = ev.getContent();
        if (content && typeof content.body === "string") {
            const b = content.body.trim().toLowerCase();
            if (
                b.startsWith("/stop") ||
                (b.length < 300 && (
                    b.includes("aborted") ||
                    b.includes("generation aborted") ||
                    b.includes("agent was aborted") ||
                    b.includes("error: agent was aborted") ||
                    b.includes("error: generation aborted") ||
                    b.includes("đã hủy tin nhắn")
                ))
            ) {
                continue;
            }
        }
        return ev;
    }
    return undefined;
}

/**
 * Kiểm tra xem room có thông báo abort nào xuất hiện sau thời điểm afterTs hay không.
 */
function hasRecentAbortMessage(room: Room, afterTs: number): boolean {
    const events = room.getLiveTimeline().getEvents();
    for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i];
        if (ev.getTs() < afterTs) break;
        if (ev.getType() !== EventType.RoomMessage) continue;
        const content = ev.getContent();
        if (content && typeof content.body === "string") {
            const b = content.body.trim().toLowerCase();
            if (
                b.length < 300 && (
                    b.includes("aborted") ||
                    b.includes("generation aborted") ||
                    b.includes("agent was aborted") ||
                    b.includes("error: agent was aborted") ||
                    b.includes("error: generation aborted") ||
                    b.includes("đã hủy tin nhắn") ||
                    b.includes("[aborted]") ||
                    b.includes("[agent was aborted]") ||
                    b.includes("[generation aborted]")
                )
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Theo dõi trạng thái "bot đang trả lời" của một room và cung cấp hàm để hủy.
 *
 * Nguồn phát hiện: cờ {@link AI_STREAMING_KEY} trên tin nhắn (xem hợp đồng ở
 * `src/ai/aiEvents.ts`). Cập nhật realtime theo timeline của room.
 */
export function useAiGeneration(room: Room): AiGenerationState & { stop: () => void } {
    const compute = useCallback((): AiGenerationState => {
        // 1. Giai đoạn 2: Ưu tiên cờ AI_STREAMING_KEY từ hợp đồng
        const streamEv = findStreamingEvent(room);
        if (streamEv) {
            return { isGenerating: true, streamingEventId: streamEv.getId() };
        }

        // 2. Giai đoạn 1 fallback: Kiểm tra trạng thái typing hoặc chờ trả lời từ bot OpenClaw
        const latestEv = findLatestValidMessage(room);
        if (!latestEv) {
            return { isGenerating: false };
        }

        const myUserId = room.client?.getUserId();
        const isMyMessage = Boolean(myUserId && latestEv.getSender() === myUserId);
        const isBotTyping = room.getMembers().some((m) => Boolean(m?.typing && m?.userId !== myUserId));
        const isAborted = Boolean((latestEv.getId() && abortedEventIds.has(latestEv.getId()!)) || hasRecentAbortMessage(room, latestEv.getTs() || 0));

        // Bot đang trả lời nếu: tin nhắn cuối là của tôi và chưa bị hủy, HOẶC bot đang typing
        if ((isMyMessage && !isAborted) || isBotTyping) {
            return { isGenerating: true, streamingEventId: undefined };
        }

        return { isGenerating: false, streamingEventId: undefined };
    }, [room]);

    const [state, setState] = useState<AiGenerationState>(compute);

    useEffect(() => {
        // Cập nhật lưu vết nội dung các tin AI trong timeline hiện tại
        const events = room.getLiveTimeline().getEvents();
        for (let i = events.length - 1; i >= 0; i--) {
            trackAiContent(events[i], room);
        }

        // Tính lại ngay khi đổi room, rồi bám theo mọi thay đổi của timeline
        // (tin placeholder xuất hiện, các lần edit khi stream, lần edit cuối gỡ cờ).
        setState(compute());
        const onUpdate = (): void => {
            const currentEvents = room.getLiveTimeline().getEvents();
            for (let i = currentEvents.length - 1; i >= 0; i--) {
                trackAiContent(currentEvents[i], room);
            }
            setState(compute());
        };

        // Khi một event chuẩn bị bị redact, lưu lại nội dung text nếu đó là tin AI/bot
        const onBeforeRedaction = (redactedEv: MatrixEvent): void => {
            if (redactedEv && redactedEv.getId()) {
                const id = redactedEv.getId()!;
                if (aiMessageIds.has(id) || abortedEventIds.has(id) || (redactedEv.getSender() && redactedEv.getSender() !== room.client?.getUserId())) {
                    const content = redactedEv.getContent();
                    if (content && typeof content.body === "string" && content.body.length > 0) {
                        aiMessageIds.add(id);
                        savedAiContentMap.set(id, { ...content });
                    }
                }
            }
        };

        // Khi VPS gửi lệnh redact (xóa tin nhắn), khôi phục lại nội dung text dang dở
        // và xóa cờ redacted_because để UI giữ nguyên đoạn text thay vì hiển thị "Message deleted".
        const onRedaction = (redactionEv: MatrixEvent): void => {
            const targetId = redactionEv.getRelation()?.event_id || redactionEv.event.content?.redacts || redactionEv.event.redacts;
            if (targetId && (aiMessageIds.has(targetId) || abortedEventIds.has(targetId))) {
                const restore = (): void => {
                    const targetEv = room.findEventById(targetId);
                    if (targetEv && savedAiContentMap.has(targetId)) {
                        const savedContent = savedAiContentMap.get(targetId);
                        targetEv.event.content = { ...savedContent };
                        if (targetEv.event.unsigned) {
                            delete targetEv.event.unsigned.redacted_because;
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (targetEv as any)._localRedactionEvent = null;
                        targetEv.emit(MatrixEventEvent.Replaced, targetEv);
                    }
                };
                restore();
                setTimeout(restore, 0);
            }
            onUpdate();
        };

        room.on(RoomEvent.Timeline, onUpdate);
        room.on(RoomEvent.TimelineReset, onUpdate);
        room.on(RoomEvent.Redaction, onRedaction);
        room.on(MatrixEventEvent.BeforeRedaction as any, onBeforeRedaction);
        room.client.on(RoomMemberEvent.Typing as any, onUpdate);
        room.client.on(MatrixEventEvent.BeforeRedaction as any, onBeforeRedaction);

        return () => {
            room.off(RoomEvent.Timeline, onUpdate);
            room.off(RoomEvent.TimelineReset, onUpdate);
            room.off(RoomEvent.Redaction, onRedaction);
            room.off(MatrixEventEvent.BeforeRedaction as any, onBeforeRedaction);
            room.client.removeListener(RoomMemberEvent.Typing as any, onUpdate);
            room.client.off(MatrixEventEvent.BeforeRedaction as any, onBeforeRedaction);
        };
    }, [room, compute]);

    const stop = useCallback((): void => {
        // Lấy event_id tại thời điểm bấm để chắc chắn nhắm đúng tin đang chạy.
        const streamEv = findStreamingEvent(room);
        const eventId = streamEv?.getId();

        // Ghi nhận hủy tin nhắn cuối cùng để lập tức ẩn nút Stop
        const latestEv = findLatestValidMessage(room);
        if (streamEv && streamEv.getId()) {
            abortedEventIds.add(streamEv.getId()!);
            trackAiContent(streamEv, room);
        }
        if (latestEv && latestEv.getId()) {
            abortedEventIds.add(latestEv.getId()!);
            trackAiContent(latestEv, room);
        }

        if (!eventId) {
            // Giai đoạn 1 fallback: gửi tín hiệu /stop tới OpenClaw trên VPS
            room.client.sendTextMessage(room.roomId, "/stop").catch((e: unknown) => {
                logger.error("Failed to send /stop message", e);
            });
        } else {
            // Giai đoạn 2: gửi event cancel đúng hợp đồng
            // Event type tùy chỉnh nằm ngoài danh sách type chuẩn của SDK nên cần cast.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (room.client.sendEvent as any)(room.roomId, AI_CANCEL_EVENT_TYPE, {
                "m.relates_to": { event_id: eventId },
            }).catch((e: unknown) => logger.error("Failed to send AI cancel event", e));
        }

        setState(compute());
    }, [room, compute]);

    return { ...state, stop };
}

