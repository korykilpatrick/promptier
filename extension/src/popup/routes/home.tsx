import React from 'react'
import { SignedIn, SignedOut } from '@clerk/chrome-extension'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="p-4 space-y-4">
      <SignedIn>
        <h1 className="text-2xl font-bold">Welcome to Promptier</h1>
        <p className="text-gray-600">
          Create and manage your prompt templates and chains.
        </p>
        <div className="mt-6 space-x-4">
          <Link 
            to="/sidebar"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Open Template Manager
          </Link>
          <Link
            to="/settings"
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Settings
          </Link>
        </div>
      </SignedIn>
      <SignedOut>
        <h1 className="text-2xl font-bold">Promptier</h1>
        <p className="text-gray-600">
          Sign in to create and manage your prompt templates.
        </p>
        <div className="mt-6">
          <Link
            to="/sign-in"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </SignedOut>
    </div>
  )
} 