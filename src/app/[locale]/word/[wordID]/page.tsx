import React from 'react'

export default function WordPage(
  {params}:{params:{wordID:string}}
) {
  return (
    <div>WordPage
      {params.wordID}
    </div>
  )
}
