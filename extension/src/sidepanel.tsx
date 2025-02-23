import React from "react"
import { ClerkProvider } from "@clerk/chrome-extension"
import { Sidebar } from "~components/sidebar/Sidebar"
import { ToastContainer } from "~components/common/Toast"
import { useToast } from "~/hooks/useToast"
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
        <Sidebar />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ClerkProvider>
  )
}

export default SidePanel