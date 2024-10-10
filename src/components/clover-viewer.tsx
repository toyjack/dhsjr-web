import dynamic from "next/dynamic";
import type {ViewerConfigOptions} from "@samvera/clover-iiif"

const CloverImage = dynamic(
  () => import("@samvera/clover-iiif").then((Clover) => Clover.Image),
  {
    ssr: false,
  },
);

const Viewer = dynamic(
  () => import("@samvera/clover-iiif").then((Clover) => Clover.Viewer),
  {
    ssr: false,
  },
);

export default function CloverViewer({ manifestUrl }: { manifestUrl: string }) {
  const options:ViewerConfigOptions = {
    informationPanel:{
      open: false
    },
    openSeadragon:{

      gestureSettingsMouse: {
        scrollToZoom: true,
        
      }
    }
  }
  return (
    <div style={{
      minHeight:"90vh",
      height:"640px"
    }}>
      <Viewer iiifContent={manifestUrl} options={options} />
    </div>
  )
}
