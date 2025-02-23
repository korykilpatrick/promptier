import React from 'react'
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/chrome-extension'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { ToastContainer } from "../../components/common/Toast"
import { useToast } from "../../hooks/useToast"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const EXTENSION_URL = chrome.runtime.getURL('.')

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

export const RootLayout = () => {
  const navigate = useNavigate()
  const { toasts, removeToast } = useToast()

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <div className="plasmo-flex plasmo-flex-col plasmo-min-h-screen plasmo-w-[400px]">
        <header className="plasmo-bg-white plasmo-shadow plasmo-p-4">
          <h1 className="plasmo-text-xl plasmo-font-bold">Promptier</h1>
        </header>
        
        <main className="plasmo-flex-1 plasmo-p-4">
          <Outlet />
        </main>

        <footer className="plasmo-bg-white plasmo-shadow-top plasmo-p-4 plasmo-flex plasmo-justify-between plasmo-items-center">
          <SignedIn>
            <div className="plasmo-flex plasmo-gap-4 plasmo-items-center">
              <Link to="/settings" className="plasmo-text-blue-600 hover:plasmo-text-blue-800">Settings</Link>
              <UserButton afterSignOutUrl={`${EXTENSION_URL}/popup.html`} />
            </div>
          </SignedIn>
          <SignedOut>
            <div className="plasmo-flex plasmo-gap-4">
              <Link to="/" className="plasmo-text-blue-600 hover:plasmo-text-blue-800">Home</Link>
              <Link to="/sign-in" className="plasmo-text-blue-600 hover:plasmo-text-blue-800">Sign In</Link>
              <Link to="/sign-up" className="plasmo-text-blue-600 hover:plasmo-text-blue-800">Sign Up</Link>
            </div>
          </SignedOut>
        </footer>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ClerkProvider>
  )
} 