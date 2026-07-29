/*
 * Copyright 2026 Element Creations Ltd.
 *
 * SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
 * Please see LICENSE files in the repository root for full details.
 */

import {
    BaseViewModel,
    type LeftResizablePanelViewActions,
    type SeparatorViewActions,
    type PanelSize,
    type PanelImperativeHandle,
    type GroupViewActions,
    type ResizerViewSnapshot,
} from "@element-hq/web-shared-components";
import { debounce } from "lodash";

import SettingsStore from "../../settings/SettingsStore";
import { SettingLevel } from "../../settings/SettingLevel";

function getInitialState(): ResizerViewSnapshot {
    if (SettingsStore.getValue("RoomList.isPanelCollapsed")) {
        return {
            isCollapsed: true,
            initialSize: 0,
        };
    }
    return {
        isCollapsed: false,
        initialSize: SettingsStore.getValue("RoomList.panelSize") ?? undefined,
    };
}

/**
 * Viewmodel that drives the resizable left panel.
 */
export class ResizerViewModel
    extends BaseViewModel<ResizerViewSnapshot, void>
    implements SeparatorViewActions, LeftResizablePanelViewActions, GroupViewActions
{
    /**
     * This object gives us access to the API methods of react-resizable-panels library.
     */
    private panelHandle?: PanelImperativeHandle;

    /**
     * Needed to distinguish between a drag and a click on the separator.
     */
    private readonly mouseClickHandler: MouseClickHandler;

    public constructor() {
        super(undefined, getInitialState());
        // Run onSeparatorClick when the separator is clicked.
        this.mouseClickHandler = new MouseClickHandler(this.onSeparatorClick);
    }

    public onLeftPanelResize = debounce((panelSize: PanelSize): void => {
        const newSize = panelSize.inPixels;
        const isCollapsed = newSize <= 1 || panelSize.asPercentage <= 0.5;
        if (this.snapshot.current.isCollapsed !== isCollapsed) {
            const lastSize = SettingsStore.getValue("RoomList.panelSize") ?? undefined;
            this.snapshot.merge({
                isCollapsed,
                initialSize: isCollapsed ? 0 : lastSize,
            });
            SettingsStore.setValue("RoomList.isPanelCollapsed", null, SettingLevel.DEVICE, isCollapsed);
        }
    }, 50);

    public onLeftPanelResized = (newSize: number): void => {
        const roundedSize = Math.round(newSize);
        const isCollapsed = roundedSize === 0 || newSize <= 0.5;
        if (this.snapshot.current.isCollapsed !== isCollapsed) {
            const lastSize = SettingsStore.getValue("RoomList.panelSize") ?? undefined;
            this.snapshot.merge({
                isCollapsed,
                initialSize: isCollapsed ? 0 : lastSize,
            });
            SettingsStore.setValue("RoomList.isPanelCollapsed", null, SettingLevel.DEVICE, isCollapsed);
        }
        if (isCollapsed) return;

        if (!this.panelHandle) return;
        // We don't want the panels to have fractional widths as that can cause blurry UI elements.
        if (!Number.isInteger(newSize)) {
            try {
                this.panelHandle.resize(`${roundedSize}%`);
            } catch (e) {
                // Ignore errors if group is unmounted during resize
            }
            return;
        }

        // Store the size if the panel isn't collapsed.
        SettingsStore.setValue("RoomList.panelSize", null, SettingLevel.DEVICE, newSize);
    };

    public setPanelHandle = (handle: PanelImperativeHandle | undefined): void => {
        this.panelHandle = handle;
    };

    public toggleLeftPanel = (): void => {
        const nextCollapsed = !this.snapshot.current.isCollapsed;
        const lastSize = SettingsStore.getValue("RoomList.panelSize") ?? undefined;
        this.snapshot.merge({
            isCollapsed: nextCollapsed,
            initialSize: nextCollapsed ? 0 : lastSize,
        });
        SettingsStore.setValue("RoomList.isPanelCollapsed", null, SettingLevel.DEVICE, nextCollapsed);
        if (this.panelHandle) {
            if (nextCollapsed) {
                try {
                    this.panelHandle.collapse();
                } catch (e) {}
            } else {
                try {
                    this.panelHandle.resize(`${lastSize ?? 100}%`);
                } catch (e) {}
            }
        }
    };

    private onSeparatorClick = (): void => {
        // When panel is collapsed, single click should expand the panel.
        if (this.snapshot.current.isCollapsed || this.panelHandle?.isCollapsed()) {
            this.toggleLeftPanel();
        }
    };

    public onDoubleClick = (): void => {
        // When the panel is expanded, double click should collapse.
        if (!this.snapshot.current.isCollapsed && !this.panelHandle?.isCollapsed()) {
            this.toggleLeftPanel();
        }
    };

    public onPointerUp = (): void => {
        this.mouseClickHandler.onPointerUp();
    };

    public onPointerMove = (): void => {
        this.mouseClickHandler.onPointerMove();
    };

    public onPointerDown = (): void => {
        this.mouseClickHandler.onPointerDown();
    };
}

/**
 * Dragging the separator will emit a click event.
 * This class uses pointer event handlers to distinguish between a drag and a click
 * on the separator.
 */
class MouseClickHandler {
    public constructor(private readonly onClick: () => void) {}

    private isResize = false;

    public onPointerUp = (): void => {
        if (!this.isResize) this.onClick();
    };

    public onPointerDown = (): void => {
        this.isResize = false;
    };

    public onPointerMove = (): void => {
        this.isResize = true;
    };
}
