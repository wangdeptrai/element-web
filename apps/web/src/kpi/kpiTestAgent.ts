/*
Copyright 2026 thehegeo

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useEffect } from "react";
import {
    type MatrixEvent,
    type Room,
    type IRoomTimelineData,
    RoomEvent,
    EventType,
    MsgType,
} from "matrix-js-sdk/src/matrix";

/**
 * ⚠️ ĐÃ NGỪNG DÙNG — đã tháo khỏi `MessageComposer.tsx`. Giữ lại chỉ để tham khảo;
 * xoá được an toàn.
 *
 * Thay bằng `kpi-bot/` ở gốc repo: một bot Matrix thật đăng nhập bằng
 * `@kpibot:localhost`, nghe room qua `/sync` rồi gọi `kpi-tool`. Vì tin do một
 * mxid KHÁC gửi nên Element xử đúng như tin của bot — hiện bong bóng bên trái
 * (`data-self="false"`) và test được cả bước 0 "allowlist người gửi" §6.3, thứ
 * mà hook này về bản chất không thể test.
 *
 * Đừng nối lại hook này song song với kpi-bot: cả hai cùng nghe một câu chat sẽ
 * sinh ra hai tin iframe.
 *
 * ---
 *
 * "Mock agent" dùng để TEST cơ chế hiển thị iframe mà không cần bot thật.
 *
 * Luồng: bạn gõ một câu bình thường vào chat → hook này gửi câu đó cho tool cục bộ
 * (`kpi-tool/server.mjs`) → tool trả về content tin `com.hegeo.iframe` đúng hợp đồng v1
 * → hook gửi tin đó vào room → Element render đúng như khi bot thật gửi.
 *
 * Vì tin nhắn đi qua đúng đường mạng (Matrix event thật trong timeline), nên toàn bộ
 * phần hiển thị được test y như thật; chỉ khác người gửi là chính bạn thay vì mxid bot
 * (⇒ chưa test được bước 0 "allowlist người gửi" của §6.3).
 *
 * Tool không chạy ⇒ hook tự tắt sau vài lần gọi lỗi, chat hoạt động bình thường.
 * Chỉ nên bật ở môi trường dev.
 */

/** Địa chỉ tool. Đổi được bằng `localStorage.setItem("kpi_tool_url", "http://localhost:5501")`. */
const DEFAULT_TOOL_URL = "http://localhost:5500";

/** Số lần gọi lỗi liên tiếp thì coi như tool không chạy và ngừng gọi. */
const MAX_FAILURES = 3;

/** Bỏ qua tin có dấu thời gian quá cũ (tránh sync sau khi mất mạng bị coi là tin mới). */
const MAX_EVENT_AGE_MS = 60_000;

/** Đã xử lý rồi thì không gọi tool lần nữa (mỗi tin chỉ sinh tối đa 1 tin iframe). */
const handled = new Set<string>();

let failures = 0;

function toolUrl(): string {
    try {
        return window.localStorage.getItem("kpi_tool_url") || DEFAULT_TOOL_URL;
    } catch {
        return DEFAULT_TOOL_URL;
    }
}

interface ResolveResponse {
    match: boolean;
    content?: Record<string, unknown>;
    why?: Record<string, unknown>;
}

async function askTool(text: string, sender: string): Promise<ResolveResponse | null> {
    try {
        const res = await fetch(`${toolUrl()}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, sender }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        failures = 0;
        return (await res.json()) as ResolveResponse;
    } catch (e) {
        failures += 1;
        if (failures === MAX_FAILURES) {
            // eslint-disable-next-line no-console
            console.info("[kpiTestAgent] không gọi được kpi-tool, tạm ngừng. Chạy `node kpi-tool/server.mjs` rồi tải lại trang.");
        }
        return null;
    }
}

/**
 * Lắng nghe tin text của chính bạn trong room, nhờ tool sinh link, rồi gửi tin iframe.
 * Chỉ phản ứng với tin mới đến trực tiếp (giống {@link useIframePanel}).
 */
export function useKpiTestAgent(room: Room): void {
    useEffect(() => {
        const client = room.client;
        const me = client.getSafeUserId();

        const onTimeline = (
            ev: MatrixEvent,
            evRoom: Room | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            data: IRoomTimelineData,
        ): void => {
            if (failures >= MAX_FAILURES) return;
            if (removed || toStartOfTimeline || !data?.liveEvent) return;
            if (evRoom?.roomId !== room.roomId) return;
            if (ev.getType() !== EventType.RoomMessage) return;
            if (ev.getSender() !== me) return; // chỉ câu chat của bạn kích hoạt tool
            if (ev.isRedacted() || ev.isDecryptionFailure()) return;

            const ts = ev.getTs();
            if (ts && Date.now() - ts > MAX_EVENT_AGE_MS) return;

            // Chỉ tin text thường; tin `com.hegeo.iframe` do chính hook gửi ra bị loại ở đây
            // ⇒ không có vòng lặp tự kích hoạt.
            const content = ev.getContent();
            if (content.msgtype !== MsgType.Text) return;

            const body = typeof content.body === "string" ? content.body.trim() : "";
            if (!body || body.startsWith("/")) return; // slash command để nguyên

            // Tin đang gửi (local echo) chưa có event id thật → chờ transaction id cho ổn định.
            const key = ev.getId() ?? ev.getTxnId();
            if (!key || handled.has(key)) return;
            handled.add(key);

            void (async () => {
                const out = await askTool(body, me);
                if (!out?.match || !out.content) return;
                try {
                    await client.sendMessage(room.roomId, out.content as never);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn("[kpiTestAgent] gửi tin iframe thất bại", e);
                }
            })();
        };

        room.on(RoomEvent.Timeline, onTimeline);
        return () => {
            room.off(RoomEvent.Timeline, onTimeline);
        };
    }, [room]);
}
