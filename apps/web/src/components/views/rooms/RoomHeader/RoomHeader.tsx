/*
Copyright (C) 2025 Element Creations Ltd
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Text, IconButton, Tooltip } from "@vector-im/compound-web";
import RoomInfoIcon from "@vector-im/compound-design-tokens/assets/web/icons/info-solid";
import SidebarIcon from "@vector-im/compound-design-tokens/assets/web/icons/sidebar";
import VerifiedIcon from "@vector-im/compound-design-tokens/assets/web/icons/verified";
import ErrorIcon from "@vector-im/compound-design-tokens/assets/web/icons/error-solid";
import PublicIcon from "@vector-im/compound-design-tokens/assets/web/icons/public";
import { HistoryVisibility, JoinRule, type Room } from "matrix-js-sdk/src/matrix";
import { type ViewRoomOpts } from "@matrix-org/react-sdk-module-api/lib/lifecycles/RoomViewLifecycle";
import { Flex, Box } from "@element-hq/web-shared-components";
import { HistoryIcon, UserProfileSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import { useRoomName } from "../../../../hooks/useRoomName.ts";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases.ts";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext.tsx";
import { _t } from "../../../../languageHandler.tsx";
import { useFeatureEnabled } from "../../../../hooks/useSettings.ts";
import { useEncryptionStatus } from "../../../../hooks/useEncryptionStatus.ts";
import { E2EStatus } from "../../../../utils/ShieldUtils.ts";
import { useRoomState } from "../../../../hooks/useRoomState.ts";
import RoomAvatar from "../../avatars/RoomAvatar.tsx";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore.ts";
import { RoomKnocksBar } from "../RoomKnocksBar.tsx";
import WithPresenceIndicator, { useDmMember } from "../../avatars/WithPresenceIndicator.tsx";
import { type IOOBData } from "../../../../stores/ThreepidInviteStore.ts";
import defaultDispatcher from "../../../../dispatcher/dispatcher.ts";
import { RoomSettingsTab } from "../../dialogs/RoomSettingsDialog-tab";
import { ToggleableIcon } from "./toggle/ToggleableIcon.tsx";
import { CurrentRightPanelPhaseContextProvider } from "../../../../contexts/CurrentRightPanelPhaseContext.tsx";
import { LocalRoom } from "../../../../models/LocalRoom.ts";
import { useIsEncrypted } from "../../../../hooks/useIsEncrypted.ts";

function RoomHeaderButtons({
    legacyAdditionalButtons,
    extraButtons,
}: {
    legacyAdditionalButtons?: ViewRoomOpts["buttons"];
    extraButtons?: JSX.Element;
}): JSX.Element {
    // Chỉ giữ nút "info" (mở bảng chi tiết phòng) + các nút do module chèn vào.
    // Đã bỏ: gọi thoại, gọi video, threads, thông báo, danh sách thành viên (facepile).
    return (
        <>
            {extraButtons}

            {legacyAdditionalButtons?.map((props) => {
                const label = props.label();

                return (
                    <Tooltip label={label} key={props.id}>
                        <IconButton
                            aria-label={label}
                            onClick={(event) => {
                                event.stopPropagation();
                                props.onClick();
                            }}
                        >
                            {typeof props.icon === "function" ? props.icon() : props.icon}
                        </IconButton>
                    </Tooltip>
                );
            })}

            <Tooltip label={_t("right_panel|room_summary_card|title")}>
                <IconButton
                    onClick={(evt) => {
                        evt.stopPropagation();
                        RightPanelStore.instance.showOrHidePhase(RightPanelPhases.RoomSummary);
                    }}
                    aria-label={_t("right_panel|room_summary_card|title")}
                >
                    <ToggleableIcon Icon={RoomInfoIcon} phase={RightPanelPhases.RoomSummary} />
                </IconButton>
            </Tooltip>
        </>
    );
}

/** Create an icon to warn the user about shared history visibility, in encrypted rooms.
 *
 * Note that we use the same icon as in the room summary card and elsewhere, to aid user recognition.
 */
function historyVisibilityIcon(historyVisibility: HistoryVisibility): JSX.Element | null {
    if (historyVisibility === HistoryVisibility.Shared) {
        return (
            <Tooltip label={_t("room|header|shared_history_tooltip")} placement="right">
                <HistoryIcon
                    width="16px"
                    height="16px"
                    className="mx_RoomHeader_icon"
                    color="var(--cpd-color-icon-info-primary)"
                    aria-label={_t("room|header|shared_history_tooltip")}
                />
            </Tooltip>
        );
    } else if (historyVisibility === HistoryVisibility.WorldReadable) {
        return (
            <Tooltip label={_t("room|header|world_readable_history_tooltip")} placement="right">
                <UserProfileSolidIcon
                    width="16px"
                    height="16px"
                    className="mx_RoomHeader_icon"
                    color="var(--cpd-color-icon-info-primary)"
                    aria-label={_t("room|header|world_readable_history_tooltip")}
                />
            </Tooltip>
        );
    } else {
        return null;
    }
}

export default function RoomHeader({
    room,
    extraButtons,
    legacyAdditionalButtons,
    oobData,
}: {
    room: Room | LocalRoom;
    // Extra buttons added by a new element web module API module
    extraButtons?: JSX.Element;
    // DEPRECATED: Buttons added by a legacy react-sdk module API module.
    legacyAdditionalButtons?: ViewRoomOpts["buttons"];
    oobData?: IOOBData;
}): JSX.Element {
    const client = useMatrixClientContext();
    const roomName = useRoomName(room);
    const joinRule = useRoomState(room, (state) => state.getJoinRule());
    const historyVisibility = useRoomState(room, (state) => state.getHistoryVisibility());
    const dmMember = useDmMember(room);
    const isDirectMessage = !!dmMember;
    const isRoomEncrypted = useIsEncrypted(client, room);
    const e2eStatus = useEncryptionStatus(client, room);
    const askToJoinEnabled = useFeatureEnabled("feature_ask_to_join");
    const onAvatarClick = (): void => {
        defaultDispatcher.dispatch({
            action: "open_room_settings",
            initial_tab_id: RoomSettingsTab.General,
        });
    };

    return (
        <CurrentRightPanelPhaseContextProvider roomId={room.roomId}>
            <Flex as="header" align="center" gap="var(--cpd-space-3x)" className="mx_RoomHeader light-panel">
                {/* Nút thu gọn/mở danh sách phòng bên trái (chỉ UI, dispatch action cho LoggedInView) */}
                <Tooltip label={_t("action|collapse")}>
                    <IconButton
                        aria-label={_t("action|collapse")}
                        onClick={() => defaultDispatcher.dispatch({ action: "hg_toggle_left_panel" })}
                    >
                        <SidebarIcon />
                    </IconButton>
                </Tooltip>
                <WithPresenceIndicator room={room}>
                    {/* We hide this from the tabIndex list as it is a pointer shortcut and superfluous for a11y */}
                    {/* Disable on-click actions until the room is created */}
                    <RoomAvatar
                        room={room}
                        size="40px"
                        oobData={oobData}
                        onClick={room instanceof LocalRoom ? undefined : onAvatarClick}
                        tabIndex={-1}
                        aria-label={_t("room|header_avatar_open_settings_label")}
                    />
                </WithPresenceIndicator>
                {/* Disable on-click actions until the room is created */}
                <button
                    aria-label={_t("right_panel|room_summary_card|title")}
                    tabIndex={0}
                    onClick={
                        room instanceof LocalRoom
                            ? undefined
                            : () => RightPanelStore.instance.showOrHidePhase(RightPanelPhases.RoomSummary)
                    }
                    className="mx_RoomHeader_infoWrapper"
                >
                    <Box flex="1" className="mx_RoomHeader_info">
                        <Text
                            as="div"
                            size="lg"
                            weight="semibold"
                            dir="auto"
                            role="heading"
                            aria-level={1}
                            className="mx_RoomHeader_heading"
                        >
                            <span className="mx_RoomHeader_truncated mx_lineClamp">{roomName}</span>

                            {!isDirectMessage && joinRule === JoinRule.Public && (
                                <Tooltip label={_t("common|public_room")} placement="right">
                                    <PublicIcon
                                        width="16px"
                                        height="16px"
                                        className="mx_RoomHeader_icon"
                                        color="var(--cpd-color-icon-info-primary)"
                                        aria-label={_t("common|public_room")}
                                    />
                                </Tooltip>
                            )}

                            {isDirectMessage && e2eStatus === E2EStatus.Verified && (
                                <Tooltip label={_t("common|verified")} placement="right">
                                    <VerifiedIcon
                                        width="16px"
                                        height="16px"
                                        className="mx_RoomHeader_icon mx_Verified"
                                        aria-label={_t("common|verified")}
                                    />
                                </Tooltip>
                            )}

                            {isDirectMessage && e2eStatus === E2EStatus.Warning && (
                                <Tooltip label={_t("room|header_untrusted_label")} placement="right">
                                    <ErrorIcon
                                        width="16px"
                                        height="16px"
                                        className="mx_RoomHeader_icon mx_Untrusted"
                                        aria-label={_t("room|header_untrusted_label")}
                                    />
                                </Tooltip>
                            )}

                            {isRoomEncrypted && historyVisibilityIcon(historyVisibility)}
                        </Text>
                    </Box>
                </button>
                {/* If the room is local-only then we don't want to show any additional buttons, as it won't work */}
                {room instanceof LocalRoom === false && (
                    <RoomHeaderButtons
                        legacyAdditionalButtons={legacyAdditionalButtons}
                        extraButtons={extraButtons}
                    />
                )}
            </Flex>
            {askToJoinEnabled && <RoomKnocksBar room={room} />}
        </CurrentRightPanelPhaseContextProvider>
    );
}
