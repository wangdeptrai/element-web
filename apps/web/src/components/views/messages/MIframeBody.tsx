import React from 'react';
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { extractIframeUrl } from "../../../hooks/useIframePanel";

interface IProps {
    mxEvent: MatrixEvent;
}

const MIframeBody: React.FC<IProps> = ({ mxEvent }) => {
    const content = mxEvent.getContent();

    console.log("[MIframeBody] RENDER", { msgtype: content.msgtype, url: content.url, body: content.body });

    // Lấy URL từ nội dung tin nhắn thông qua hàm dùng chung
    const iframeUrl = extractIframeUrl(mxEvent);

    if (!iframeUrl) {
        return <div className="mx_MTextBody"><i>Invalid or unsafe Iframe URL</i></div>;
    }

    const sandboxFlags = "allow-forms allow-popups allow-same-origin allow-scripts";

    // Màu lấy từ design token: giá trị cứng trước đây (#111827/#374151) là màu
    // của theme tối nên khung nhúng thành một mảng đen giữa nền sáng.
    return (
        <div className="mx_MTextBody" style={{ marginTop: "8px", width: "100%" }}>
            <iframe
                src={iframeUrl}
                sandbox={sandboxFlags}
                style={{
                    width: "100%",
                    height: "450px",
                    border: "1px solid var(--hg-seam)",
                    borderRadius: "var(--hg-radius-md)",
                    backgroundColor: "var(--hg-surface-sunken)",
                }}
                title="Embedded UI"
            />
        </div>
    );
};

export default MIframeBody;