"use client";

import Script from "next/script";

export default function UvViewer({ manifestUrl, iiifPage }: { manifestUrl: string, iiifPage: number }) {
  return (
    <div>
      <div id="uv" className="uv" />
      <Script
        id="uv-script"
        src="https://cdn.jsdelivr.net/npm/universalviewer@4.0.0/dist/umd/UV.js"
        onLoad={() => {
          const data = {
            manifest: manifestUrl,
            canvasIndex: iiifPage-1,
          };
          // @ts-ignore
          const uv = UV.init("uv", data);

          // @ts-ignore
          uv.on("configure", ({ config, cb }) => {
            cb({
              options: {
                headerPanelEnabled: true,
                footerPanelEnabled: true,
                leftPanelEnabled: true,
                rightPanelEnabled: true,
                pagingEnabled: true,
                pagingOptionEnabled: true,
              },
              modules: {
                contentLeftPanel: {
                  panelOpen: false,
                },
                footerPanel: {
                  shareEnabled: false,
                  fullscreenEnabled: true,
                },
              },
            });
          });
        }}
      />
    </div>
  );
}
