"use client";

import TifyViewer from "./tify-viewer";
import { cn } from "@/lib/utils";
import UvViewer from "./uv-viewer";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAtom } from "jotai";
import { currentIFFFViewerAtom } from "@/lib/atoms";

const MiradorViewer = dynamic(() => import("@/components/mirador-viewer"), {
  ssr: false,
});

export default function IiifViewer({ manifestUrl, iiifPage=1 }: { manifestUrl: string, iiifPage?: number }) {
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
        <p>Page: {iiifPage}</p>
      </div>

      <div role="tablist" className="tabs tabs-boxed">
        <button
          type="button"
          role="tab"
          aria-selected={currentViewer === "tify"}
          className={cn("tab", currentViewer === "tify" ? "tab-active" : "")}
          onClick={() => setCurrentViewer("tify")}
        >
          Viewer: TIFY
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentViewer === "mirador"}
          className={cn("tab", currentViewer === "mirador" ? "tab-active" : "")}
          onClick={() => setCurrentViewer("mirador")}
        >
          Viewer: Mirador
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={currentViewer === "uv"}
          className={cn("tab", currentViewer === "uv" ? "tab-active" : "")}
          onClick={() => setCurrentViewer("uv")}
        >
          Viewer: Universal Viewer
        </button>
      </div>

      <div>
        {currentViewer === "tify" && <TifyViewer manifestUrl={manifestUrl} iiifPage={iiifPage} />}
        {currentViewer === "mirador" && (
          <MiradorViewer manifestUrl={manifestUrl} iiifPage={iiifPage} />
        )}
        {currentViewer === "uv" && <UvViewer manifestUrl={manifestUrl} iiifPage={iiifPage} />}
      </div>
    </div>
  );
}
