"use client";

import Script from 'next/script'
import React, { useEffect, useRef } from 'react'
import Mirador from 'mirador/dist/es/src/index';

export default function MiradorViewer({manifestUrl}: {manifestUrl: string}) {
  // bugging
  useEffect(() => {
    Mirador.viewer({
      id: 'mirador',
      windows: [{
        loadedManifest: manifestUrl,
      }],
    })
  })
  return (
    <div>
      <div id="mirador" style={{minHeight:"90vh"}}></div>
    </div>
  )
}
