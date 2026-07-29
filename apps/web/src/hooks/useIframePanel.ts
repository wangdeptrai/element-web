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

import RightPanelStore from "../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../stores/right-panel/RightPanelStorePhases";

/**
 * msgtype của tin nhắn nhúng iframe. PHẢI khớp với key đã đăng ký trong
 * `MessageEvent.tsx` (bảng `baseBodyTypes`) — nơi cùng msgtype này được render
 * inline trong timeline bằng `MIframeBody`.
 *
 * Giai đoạn hiện tại (chưa phân biệt chat/panel): cùng một tin `com.hegeo.iframe`
 * vừa hiển thị inline trong chat, vừa tự bật panel bên phải. Logic phân biệt
 * "hiện ở chat hay ở panel" sẽ chốt sau (xem `ke-hoach-panel-kpi.md`, mục 4/Giai đoạn 2b).
 */
export const IFRAME_MSGTYPE = "com.hegeo.iframe";

/**
 * Lấy URL nhúng từ content tin nhắn và kiểm tra là http(s) hợp lệ.
 * Trả về URL đã chuẩn hoá, hoặc null nếu không dùng được.
 */
export function extractIframeUrl(ev: MatrixEvent): string | null {
    const content = ev.getContent();
    
    if (content?.msgtype === IFRAME_MSGTYPE) {
        const raw = content.url || content.body;
        if (typeof raw === "string") {
            try {
                const parsed = new URL(raw);
                if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
            } catch {
                return null;
            }
        }
        return null;
    }

    // Tạm thời: Hỗ trợ tìm kiếm URL trong tin nhắn m.text thông thường
    if (content?.msgtype === MsgType.Text || content?.msgtype === "m.text") {
        const raw = content.body;
        if (typeof raw === "string") {
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const match = raw.match(urlRegex);
            if (match) {
                try {
                    const parsed = new URL(match[1]);
                    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
                } catch {
                    return null;
                }
            }
        }
    }
    
    return null;
}

/**
 * Tự động mở panel KPI khi nhận được tin nhắn iframe (msgtype {@link IFRAME_MSGTYPE}).
 *
 * Chỉ phản ứng với **tin đến trực tiếp (live)** — bỏ qua lúc tải lịch sử / phân trang /
 * đổi room — để panel không tự bật lại khi cuộn lại tin cũ.
 *
 * Cùng URL đang mở → `setCard` không làm iframe reload (xem PlaneCard). URL mới → mở/đổi panel.
 */
export function useIframePanel(room: Room): void {
    useEffect(() => {
        const onTimeline = (
            ev: MatrixEvent,
            evRoom: Room | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            data: IRoomTimelineData,
        ): void => {
            // Chỉ tin mới đến trực tiếp trong đúng room này.
            if (removed || toStartOfTimeline || !data?.liveEvent) return;
            if (evRoom?.roomId !== room.roomId) return;
            if (ev.getType() !== EventType.RoomMessage) return;

            const url = extractIframeUrl(ev);
            if (!url) return;

            RightPanelStore.instance.setCard(
                { phase: RightPanelPhases.Plane, state: { planeUrl: url } },
                true,
                room.roomId,
            );
        };

        room.on(RoomEvent.Timeline, onTimeline);
        return () => {
            room.off(RoomEvent.Timeline, onTimeline);
        };
    }, [room]);
}
