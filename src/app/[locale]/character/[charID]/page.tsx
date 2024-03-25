import { prisma } from "@/lib/prisma";
import React from "react";

export default async function CharacterPage({
  params,
}: {
  params: { charID: string };
}) {
  const character = await prisma.dhsjr.findUnique({
    where:{
      character_id: params.charID
    }
  })
  
  return <div>
    <div>CharacterPage: {params.charID}</div>
    <pre>
      {JSON.stringify(character, null, 2)}
    </pre>
  </div>;
}
