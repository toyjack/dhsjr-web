"use client";

import Script from 'next/script'

export default function UvViewer({manifestUrl}: {manifestUrl: string}) {
  return (
    <div>
      <div id="uv" style={{minHeight:"90vh"}} />
      <Script
        id="uv"
        src="https://cdn.jsdelivr.net/npm/universalviewer@4.0.0/dist/umd/UV.js"
        onLoad={() => {
          const data = {
            manifest: manifestUrl,
          };
          // @ts-ignore
          const uv = UV.init("uv", data);
        }}
      />
    </div>
  )
}
