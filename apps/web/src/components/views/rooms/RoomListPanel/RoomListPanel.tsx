/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState, useCallback, useContext } from "react";
import { Flex, RoomListHeaderView, useCreateAutoDisposedViewModel, UserMenu } from "@element-hq/web-shared-components";

import { shouldShowComponent } from "../../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../../settings/UIFeature";
import { RoomListSearch } from "./RoomListSearch";
import { RoomListView } from "./RoomListView";
import { _t } from "../../../../languageHandler";
import { getKeyBindingsManager } from "../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../accessibility/KeyboardShortcuts";
import { Landmark, LandmarkNavigation } from "../../../../accessibility/LandmarkNavigation";
import { type IState as IRovingTabIndexState } from "../../../../accessibility/RovingTabIndex";
import { RoomListHeaderViewModel } from "../../../../viewmodels/room-list/RoomListHeaderViewModel";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { SDKContext } from "../../../../contexts/SDKContext.ts";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { UserMenuViewModel } from "../../../../viewmodels/menus/UserMenuViewModel";
import { OwnProfileStore } from "../../../../stores/OwnProfileStore";

type RoomListPanelProps = {
    /**
     * Current active space
     * See {@link RoomListSearch}
     */
    activeSpace: string;
};

/**
 * The panel of the room list
 */
export const RoomListPanel: React.FC<RoomListPanelProps> = ({ activeSpace }) => {
    const sdkContext = useContext(SDKContext);
    const displayRoomSearch = shouldShowComponent(UIComponent.FilterContainer);
    const [focusedElement, setFocusedElement] = useState<Element | null>(null);

    const onFocus = useCallback((ev: React.FocusEvent): void => {
        setFocusedElement(ev.target as Element);
    }, []);

    const onBlur = useCallback((): void => {
        setFocusedElement(null);
    }, []);

    const onKeyDown = useCallback(
        (ev: React.KeyboardEvent, state?: IRovingTabIndexState): void => {
            if (!focusedElement) return;
            const navAction = getKeyBindingsManager().getNavigationAction(ev);
            if (navAction === KeyBindingAction.PreviousLandmark || navAction === KeyBindingAction.NextLandmark) {
                ev.stopPropagation();
                ev.preventDefault();
                LandmarkNavigation.findAndFocusNextLandmark(
                    Landmark.ROOM_SEARCH,
                    navAction === KeyBindingAction.PreviousLandmark,
                );
            }
        },
        [focusedElement],
    );

    const matrixClient = useMatrixClientContext();
    const vm = useCreateAutoDisposedViewModel(
        () => new RoomListHeaderViewModel({ matrixClient, spaceStore: sdkContext.spaceStore }),
    );

    // Avatar (menu người dùng) — trước đây nằm ở SpacePanel bên trái, nay dời vào đầu
    // danh sách phòng, cùng hàng với ô tìm kiếm. `true` = dạng thu gọn (chỉ icon avatar).
    const userMenuVm = useCreateAutoDisposedViewModel(
        () =>
            new UserMenuViewModel(
                { ownProfileStore: OwnProfileStore.instance },
                defaultDispatcher,
                matrixClient,
                true,
            ),
    );

    return (
        <Flex
            as="nav"
            className="mx_RoomListPanel"
            direction="column"
            align="stretch"
            aria-label={_t("room_list|list_title")}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
        >
            <div className="mx_RoomListPanel_header">
                <UserMenu vm={userMenuVm} className="mx_UserMenu" />
                {displayRoomSearch && <RoomListSearch activeSpace={activeSpace} />}
            </div>
            <RoomListHeaderView vm={vm} />
            <RoomListView />
        </Flex>
    );
};
