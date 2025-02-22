import React from 'react'
import { SignedIn, SignedOut } from '@clerk/chrome-extension'

export const Home = () => {
  return (
    <div className="plasmo-space-y-4">
      <SignedIn>
        <h1 className="plasmo-text-2xl plasmo-font-bold">Welcome to Promptier</h1>
        <p className="plasmo-text-gray-600">
          Create and manage your prompt templates and chains.
        </p>
      </SignedIn>
      <SignedOut>
        <h1 className="plasmo-text-2xl plasmo-font-bold">Promptier</h1>
        <p className="plasmo-text-gray-600">
          Sign in to create and manage your prompt templates.
        </p>
      </SignedOut>
    </div>
  )
} 