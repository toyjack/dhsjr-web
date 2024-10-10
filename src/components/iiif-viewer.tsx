"use client";

import { useState } from "react";
import TifyViewer from "./tify-viewer";
import { cn } from "@/lib/utils";
import UvViewer from "./uv-viewer";
import dynamic from "next/dynamic";
import Link from "next/link";

const MiradorViewer = dynamic(() => import("@/components/mirador-js"), {
  ssr: false,
});

export default function IiifViewer({ manifestUrl }: { manifestUrl: string }) {
  const [activeTab, setActiveTab] = useState("tify");

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2>IIIF Viewer</h2>
        <p>Manifest URL: <Link className="link link-hover" href={manifestUrl} target="_blank">{manifestUrl}</Link></p>
      </div>
      <div role="tablist" className="tabs tabs-boxed">
        <a
          role="tab"
          className={cn("tab", activeTab === "tify" ? "tab-active" : "")}
          onClick={() => setActiveTab("tify")}
        >
          Viewer: TIFY
        </a>
        <a
          role="tab"
          className={cn("tab", activeTab === "mirador" ? "tab-active" : "")}
          onClick={() => setActiveTab("mirador")}
        >
          Viewer: Mirador
        </a>
        <a
          role="tab"
          className={cn("tab", activeTab === "uv" ? "tab-active" : "")}
          onClick={() => setActiveTab("uv")}
        >
          Viewer: Universal Viewer
        </a>
      </div>

      <div>
        {activeTab === "tify" && <TifyViewer manifestUrl={manifestUrl} />}
        {activeTab === "mirador" && <MiradorViewer manifestUrl={manifestUrl} />}
        {activeTab === "uv" && <UvViewer manifestUrl={manifestUrl} />}
      </div>

      {/* <div>
        <div>
          <TifyViewer manifestUrl={manifestUrl} />
        </div>
      </div> */}
    </div>
  );
}
