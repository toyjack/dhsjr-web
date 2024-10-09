"use client";

import "tify/dist/tify.css";
import "tify";
import { useEffect } from "react";

export default function IiifViewer({ manifestUrl }: { manifestUrl: string }) {
  useEffect(() => {
    // @ts-ignore
    new Tify({
      container: "#tify",
      manifestUrl,
    });
  });

  return (
    <div>
      <div className="divider" />
      <div id="tify" style={{ height: "640px" }}>
        IIIF Viewer
      </div>
    </div>
  );
}
