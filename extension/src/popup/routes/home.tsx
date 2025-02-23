import React from 'react'
import { SignedIn, SignedOut } from '@clerk/chrome-extension'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="plasmo-space-y-4">
      <SignedIn>
        <h1 className="plasmo-text-2xl plasmo-font-bold">Welcome to Promptier</h1>
        <p className="plasmo-text-gray-600">
          Create and manage your prompt templates and chains.
        </p>
        <div className="plasmo-mt-6">
          <Link 
            to="/sidebar"
            className="plasmo-inline-flex plasmo-items-center plasmo-px-4 plasmo-py-2 plasmo-bg-blue-600 plasmo-text-white plasmo-rounded-md plasmo-hover:bg-blue-700 plasmo-transition-colors"
          >
            Open Sidebar View
          </Link>
        </div>
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