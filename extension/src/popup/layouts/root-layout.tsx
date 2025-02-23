import React from "react";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/chrome-extension";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { ToastContainer } from "../../components/common/Toast";
import { useToast } from "../../hooks/useToast";

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const EXTENSION_URL = chrome.runtime.getURL(".");

if (!PUBLISHABLE_KEY) {
  throw new Error("Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file");
}

export const RootLayout = () => {
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();

  return (
    <ClerkProvider
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <div className="plasmo-min-h-screen plasmo-w-[400px] plasmo-bg-gray-50 plasmo-flex plasmo-flex-col">
        <header className="plasmo-bg-white plasmo-p-6 plasmo-shadow-sleek">
          <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
            <h1 className="plasmo-text-xl plasmo-font-semibold plasmo-text-gray-900">Promptier</h1>
            <SignedIn>
              <UserButton afterSignOutUrl={`${EXTENSION_URL}/popup.html`} />
            </SignedIn>
          </div>
        </header>

        <main className="plasmo-flex-1 plasmo-p-6">
          <Outlet />
        </main>

        <footer className="plasmo-bg-white plasmo-p-6 plasmo-shadow-sleek plasmo-flex plasmo-justify-between plasmo-items-center">
          <SignedOut>
            <div className="plasmo-flex plasmo-gap-6">
              <Link to="/" className="plasmo-text-blue-600 plasmo-text-sm plasmo-font-medium hover:plasmo-text-blue-700 plasmo-transition-colors">
                Home
              </Link>
              <Link to="/sign-in" className="plasmo-text-blue-600 plasmo-text-sm plasmo-font-medium hover:plasmo-text-blue-700 plasmo-transition-colors">
                Sign In
              </Link>
              <Link to="/sign-up" className="plasmo-text-blue-600 plasmo-text-sm plasmo-font-medium hover:plasmo-text-blue-700 plasmo-transition-colors">
                Sign Up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <Link to="/settings" className="plasmo-text-blue-600 plasmo-text-sm plasmo-font-medium hover:plasmo-text-blue-700 plasmo-transition-colors">
              Settings
            </Link>
          </SignedIn>
        </footer>

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ClerkProvider>
  );
};