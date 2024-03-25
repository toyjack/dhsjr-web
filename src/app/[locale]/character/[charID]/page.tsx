import React from "react";

export default function CharacterPage({
  params,
}: {
  params: { charID: string };
}) {
  return <div>CharacterPage: {params.charID}</div>;
}
