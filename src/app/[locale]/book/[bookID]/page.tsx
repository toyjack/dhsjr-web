import React from 'react'

export default function BookPage(
  {params}:{params:{bookID:string}}
) {
  return (
    <div>BookPage:{params.bookID}</div>
  )
}
