import React from 'react'
import ThemeToggle from './theme-toggle'
import LangSwitch from './lang-switch'
import Link from 'next/link'

export default function Header() {
  return (
    <div className='navbar w-full bg-base-100'>
      <div className="flex-1">
        <Link href={"/"} className='btn btn-ghost text-xl'>横断漢字音簡易検索</Link>
      </div>
      <div className='flex-none gap-2'>
        <ThemeToggle />
        <LangSwitch />
      </div>
    </div>
  )
}
