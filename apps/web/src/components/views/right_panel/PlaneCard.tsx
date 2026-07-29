/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import React, { type JSX, type MouseEvent } from "react";

import BaseCard from "./BaseCard";

const PLANE_CARD_TITLE = "KPI";

interface IProps {
    /** The URL to embed (e.g. the KPI screen). */
    url: string;
    onClose(this: void, ev: MouseEvent<HTMLButtonElement>): void;
}

/**
 * Validate that `url` is a safe http(s) URL we are willing to embed.
 * Returns the normalised URL string, or null if it is not embeddable.
 */
function safeUrl(url: string): string | null {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * PlaneCard (hegeo): a right-panel card that embeds an arbitrary URL — used to open the KPI screen
 * as an interactive panel. The sandbox intentionally includes `allow-same-origin` so the embedded
 * app keeps its own cookies/storage (i.e. stays logged in) and can run its scripts/forms.
 *
 * NOTE: the embedded site must allow being framed by this origin (no `X-Frame-Options: DENY`,
 * and `Content-Security-Policy: frame-ancestors` must permit it) or the browser shows
 * "refused to connect". That is enforced by the target server, not by Element.
 */
export default function PlaneCard({ url, onClose }: IProps): JSX.Element {
    const src = safeUrl(url);

    // `allow-same-origin` is required so the embedded app can use its own storage/cookies.
    // Combined with `allow-scripts` this lets a same-origin document escape the sandbox, so only
    // embed URLs you trust (this card is opened deliberately, not from arbitrary message content).
    const sandbox = "allow-forms allow-popups allow-scripts allow-same-origin allow-downloads";

    return (
        <BaseCard header={PLANE_CARD_TITLE} className="mx_PlaneCard" onClose={onClose} withoutScrollContainer>
            {src ? (
                <iframe
                    src={src}
                    sandbox={sandbox}
                    title={PLANE_CARD_TITLE}
                    allow="clipboard-read; clipboard-write"
                    style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        border: 0,
                        backgroundColor: "var(--cpd-color-bg-canvas-default)",
                    }}
                />
            ) : (
                <div style={{ padding: "16px", color: "var(--cpd-color-text-critical-primary)" }}>
                    URL không hợp lệ (chỉ chấp nhận http/https).
                </div>
            )}
        </BaseCard>
    );
}
