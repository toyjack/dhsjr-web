"use client";

import "tify/dist/tify.css";
// @ts-ignore
import "tify";
import { useEffect } from "react";
import { useCurrentLocale } from "@/locales/client";

export default function TifyViewer({ manifestUrl, iiifPage }: { manifestUrl: string, iiifPage: number }) {
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    // @ts-ignore
    const tify = new Tify({
      container: "#tify",
      manifestUrl,
      language: currentLocale,
      translationsDirUrl:"/iiif/tify/locales",
      pages:[iiifPage],
    });

    return () => {
      // @ts-ignore
      tify.destroy();
    }
  }, [manifestUrl, currentLocale, iiifPage]);

  return (
    <div id="tify" style={{ height: "640px", minHeight: "90vh" }}>
      IIIF Viewer
    </div>
  );
}
