"use client";

import "tify/dist/tify.css";
import "tify";
import { useEffect } from "react";
import { useCurrentLocale } from "@/locales/client";

export default function IiifViewer({ manifestUrl }: { manifestUrl: string }) {
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    // @ts-ignore
    new Tify({
      container: "#tify",
      manifestUrl,
      // language: currentLocale,
    });
  },[currentLocale,manifestUrl]);

  return (
    <div>
      <div className="divider" />
      <div id="tify" style={{ height: "640px" }}>
        IIIF Viewer
      </div>
    </div>
  );
}
