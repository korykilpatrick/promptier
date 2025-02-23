import React from "react"
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from "@clerk/chrome-extension"
import { Sidebar } from "~components/sidebar/Sidebar"
import { ToastContainer } from "~components/common/Toast"
import { useToast } from "~hooks/useToast"
import "./style.css"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file")
}

function SidePanel() {
  const { toasts, removeToast } = useToast()

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={chrome.runtime.getURL("sidepanel.html")}
      signInFallbackRedirectUrl={chrome.runtime.getURL("sidepanel.html")}
      signUpFallbackRedirectUrl={chrome.runtime.getURL("sidepanel.html")}
    >
      <div 
        className="plasmo-h-screen plasmo-w-[480px] plasmo-bg-gray-50 plasmo-flex plasmo-flex-col"
        role="complementary"
        aria-label="Promptier Side Panel"
      >
        <header className="plasmo-bg-white plasmo-p-4 plasmo-shadow-sleek plasmo-flex plasmo-justify-between plasmo-items-center">
          <h1 className="plasmo-text-xl plasmo-font-semibold plasmo-text-gray-900">Promptier</h1>
          <SignedIn>
            <UserButton afterSignOutUrl={chrome.runtime.getURL("sidepanel.html")} />
          </SignedIn>
        </header>
        <main className="plasmo-flex-1 plasmo-overflow-y-auto">
          <SignedIn>
            <Sidebar />
          </SignedIn>
          <SignedOut>
            <div className="plasmo-p-6 plasmo-flex plasmo-flex-col plasmo-items-center">
              <h2 className="plasmo-text-lg plasmo-font-medium plasmo-mb-4">Sign In to Promptier</h2>
              <SignIn 
                routing="virtual"
                appearance={{
                  elements: {
                    socialButtonsRoot: 'plasmo-hidden',
                    dividerRow: 'plasmo-hidden',
                  },
                }}
              />
            </div>
          </SignedOut>
        </main>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ClerkProvider>
  )
}

export default SidePanel