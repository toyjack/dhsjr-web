"use client";

import "tify/dist/tify.css";
// @ts-ignore
import "tify";
import { useEffect } from "react";
import { useCurrentLocale } from "@/locales/client";

export default function TifyViewer({ manifestUrl }: { manifestUrl: string }) {
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    // @ts-ignore
    const tify = new Tify({
      container: "#tify",
      manifestUrl,
      language: currentLocale,
      translationsDirUrl:"/iiif/tify/locales"
    });

    return () => {
      // @ts-ignore
      tify.destroy();
    }
  });

  return (
    <div id="tify" style={{ height: "640px", minHeight: "90vh" }}>
      IIIF Viewer
    </div>
  );
}
