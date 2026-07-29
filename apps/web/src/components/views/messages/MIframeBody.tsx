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

    return (
        <div className="mx_MTextBody" style={{ marginTop: '8px', width: '100%' }}>
            <iframe
                src={iframeUrl}
                sandbox={sandboxFlags}
                style={{
                    width: '100%',
                    height: '450px',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    backgroundColor: '#111827'
                }}
                title="Embedded UI"
            />
        </div>
    );
};

export default MIframeBody;