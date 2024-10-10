"use client";

import TifyViewer from "./tify-viewer";
import { cn } from "@/lib/utils";
import UvViewer from "./uv-viewer";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAtom } from "jotai";
import { currentIFFFViewerAtom } from "@/lib/atoms";

const MiradorViewer = dynamic(() => import("@/components/mirador-js"), {
  ssr: false,
});

export default function IiifViewer({ manifestUrl }: { manifestUrl: string }) {
  const [currentViewer, setCurrentViewer] = useAtom(currentIFFFViewerAtom);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2>IIIF Viewer</h2>
        <p>
          Manifest URL:{" "}
          <Link className="link link-hover" href={manifestUrl} target="_blank">
            {manifestUrl}
          </Link>
        </p>
      </div>

      <div role="tablist" className="tabs tabs-boxed">
        <a
          role="tab"
          className={cn("tab", currentViewer === "tify" ? "tab-active" : "")}
          // biome-ignore lint/a11y/useValidAnchor: <explanation>
          onClick={() => setCurrentViewer("tify")}
        >
          Viewer: TIFY
        </a>
        <a
          role="tab"
          className={cn("tab", currentViewer === "mirador" ? "tab-active" : "")}
          // biome-ignore lint/a11y/useValidAnchor: <explanation>
          onClick={() => setCurrentViewer("mirador")}
        >
          Viewer: Mirador
        </a>
        <a
          role="tab"
          className={cn("tab", currentViewer === "uv" ? "tab-active" : "")}
          // biome-ignore lint/a11y/useValidAnchor: <explanation>
          onClick={() => setCurrentViewer("uv")}
        >
          Viewer: Universal Viewer
        </a>
      </div>

      <div>
        {currentViewer === "tify" && <TifyViewer manifestUrl={manifestUrl} />}
        {currentViewer === "mirador" && (
          <MiradorViewer manifestUrl={manifestUrl} />
        )}
        {currentViewer === "uv" && <UvViewer manifestUrl={manifestUrl} />}
      </div>
    </div>
  );
}
