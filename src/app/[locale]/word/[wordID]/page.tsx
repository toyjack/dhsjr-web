import React from 'react'

export default async function WordPage(props:{params: Promise<{wordID:string}>}) {
  const params = await props.params;
  return (
    <div>WordPage
      {params.wordID}
    </div>
  )
}
