import { useEffect, useMemo } from "react";
import mirador from "mirador";
import { useCurrentLocale } from "@/locales/client";

const MiradorViewer = ({ manifestUrl, iiifPage }) => {
  const currentLocale = useCurrentLocale();
  const iiifIndex = iiifPage - 1;

  const config = useMemo(
    () => ({
      id: "mirador",
      language: currentLocale,
      windows: [
        {
          loadedManifest: manifestUrl,
          canvasIndex: iiifIndex,
        },
      ],
      window: {
        allowClose: false,
        allowMaximize: false,
        allowFullscreen: true,
        hideWindowTitle: true,
      },
      workspace:{
        // showZoomControls: true,
      },
      workspaceControlPanel: {
        enabled: false,
      },
    }),
    [manifestUrl, currentLocale, iiifIndex]
  );

  useEffect(() => {
    const miradorInstance = mirador.viewer(config);

    return () => {
      miradorInstance.unmount();
    };
  }, [config]);

  return (
    <div>
      <div
        id={config.id}
        style={{
          minHeight: "90vh",
        }}
        className="relative"
      />
    </div>
  );
};

export default MiradorViewer;
