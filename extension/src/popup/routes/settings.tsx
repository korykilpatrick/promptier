import React from 'react'
import { UserProfile } from '@clerk/chrome-extension'

export const Settings = () => {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center">
      <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-mb-4">Settings</h1>
      <UserProfile routing="virtual" />
    </div>
  )
} 