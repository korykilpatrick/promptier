import React from "react";
import { SignedIn, SignedOut } from "@clerk/chrome-extension";
import { Link } from "react-router-dom";

export const Home = () => {
  return (
    <div className="plasmo-space-y-6">
      <SignedIn>
        <h1 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900">Welcome to Promptier</h1>
        <p className="plasmo-text-gray-500 plasmo-text-sm">Create and manage your prompt templates and chains.</p>
        <div className="plasmo-flex plasmo-gap-4">
          <Link to="/sidebar" className="plasmo-btn-primary">
            Open Template Manager
          </Link>
          <Link to="/settings" className="plasmo-btn-secondary">
            Settings
          </Link>
        </div>
      </SignedIn>
      <SignedOut>
        <h1 className="plasmo-text-2xl plasmo-font-semibold plasmo-text-gray-900">Promptier</h1>
        <p className="plasmo-text-gray-500 plasmo-text-sm">Sign in to create and manage your prompt templates.</p>
        <Link to="/sign-in" className="plasmo-btn-primary">
          Sign In
        </Link>
      </SignedOut>
    </div>
  );
};