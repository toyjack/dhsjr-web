"use client";

import { useState } from "react";
import TifyViewer from "./tify-viewer";
import { cn } from "@/lib/utils";
import MiradorViewer from "./mirador-viewer";
import UvViewer from "./uv-viewer";

export default function IiifViewer({ manifestUrl }: { manifestUrl: string }) {
  const [activeTab, setActiveTab] = useState("tify");

  return (
    <div>
      <div role="tablist" className="tabs tabs-boxed">
        <a role="tab" className={cn("tab",activeTab==="tify"?"tab-active":"")} onClick={()=>setActiveTab("tify")}>
          Viewer: TIFY
        </a>
        <a role="tab" className={cn("tab",activeTab==="mirador"?"tab-active":"")} onClick={()=>setActiveTab("mirador")}>
          Viewer: Mirador
        </a>
        <a role="tab" className={cn("tab",activeTab==="uv"?"tab-active":"")} onClick={()=>setActiveTab("uv")}>
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
