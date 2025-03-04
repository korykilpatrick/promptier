import React from "react"
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from "@clerk/chrome-extension"
import { MemoryRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom"
import { ToastContainer } from "~components/common/Toast"
import { useToast } from "~hooks/useToast"
import "./style.css"
import VariablesPage from "~components/sidebar/variables/VariablesPage"
import { Navigation } from "~components/sidebar/Navigation"
import { useTemplates } from "~hooks/useTemplates"
import { useState, useEffect } from "react"

// Access components using require to match how they're exported
const { Sidebar } = require("~components/sidebar/Sidebar") 
const { TemplateDetails } = require("~components/sidebar/template/TemplateDetails")

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file")
}

// Define a Template interface
interface Template {
  id: number | string;
  name: string;
  content: string;
  category?: string;
  isFavorite?: boolean;
  variables?: Record<string, string>;
}

// Simple wrapper component to fetch template by ID and pass it to TemplateDetails
function TemplateDetailsWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toastUtils = useToast();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { templates, fetchTemplates } = useTemplates({ toast: toastUtils });

  useEffect(() => {
    async function loadTemplate() {
      if (isLoading) return;
      
      try {
        setIsLoading(true);
        
        // If we don't have an ID, we're creating a new template
        if (!id) {
          setTemplate(null);
          setIsLoading(false);
          return;
        }
        
        // Check if templates are already loaded
        if (templates && templates.length > 0) {
          const templateId = Number(id);
          const foundTemplate = templates.find(t => 
            t.id === templateId || String(t.id) === String(id)
          );
          
          if (foundTemplate) {
            setTemplate(foundTemplate);
            setIsLoading(false);
            return;
          }
        }
        
        // If not found in loaded templates, fetch from server
        const fetchedTemplates = await fetchTemplates();
        
        if (fetchedTemplates && Array.isArray(fetchedTemplates)) {
          const templateId = Number(id);
          const foundTemplate = fetchedTemplates.find((t: any) => 
            t.id === templateId || String(t.id) === String(id)
          );
          
          if (foundTemplate) {
            setTemplate(foundTemplate);
          } else {
            setError(`Template with ID ${id} not found`);
          }
        } else {
          setError("Failed to load templates");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Error Loading Template: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTemplate();
  }, [id, templates, fetchTemplates, isLoading]);

  if (isLoading) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-h-full">
        <div className="plasmo-text-center">
          <div className="plasmo-animate-spin plasmo-h-8 plasmo-w-8 plasmo-border-3 plasmo-border-primary-200 plasmo-border-t-primary-600 plasmo-rounded-full plasmo-mx-auto plasmo-mb-3"></div>
          <p className="plasmo-text-gray-700 plasmo-text-sm">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-h-full">
        <div className="plasmo-card plasmo-p-4 plasmo-max-w-md plasmo-w-full plasmo-text-center">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-w-10 plasmo-h-10 plasmo-mx-auto plasmo-rounded-full plasmo-bg-error-100 plasmo-text-error-600 plasmo-mb-3">
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="plasmo-text-base plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">{error}</h3>
          <button
            className="plasmo-btn-primary plasmo-w-full"
            onClick={() => navigate("/")}>
            Return to Template List
          </button>
        </div>
      </div>
    );
  }

  return (
    <TemplateDetails 
      template={template} 
      onBack={() => navigate("/")} 
      onTemplateChange={(updatedTemplate: Template) => setTemplate(updatedTemplate)}
    />
  );
}

function SidePanel() {
  const { toasts, removeToast } = useToast()

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY || ""}
      afterSignOutUrl={chrome.runtime.getURL("sidepanel.html")}
      signInFallbackRedirectUrl={chrome.runtime.getURL("sidepanel.html")}
      signUpFallbackRedirectUrl={chrome.runtime.getURL("sidepanel.html")}
    >
      <div className="plasmo-h-full plasmo-w-[480px] plasmo-bg-gray-50 plasmo-flex plasmo-flex-col">
        {/* More compact header - reduced height by 20% */}
        <header className="plasmo-compact-header">
          <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <svg className="plasmo-w-6 plasmo-h-6 plasmo-text-primary-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.25 11.75L17.25 6.75L14.25 9.75L12.75 4.75L7.75 9.25L4.75 8.75V19.25H19.25V11.75Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.75 13.25L11.25 17.25L15.25 13.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900">Promptier</h1>
          </div>
          <SignedIn>
            <UserButton afterSignOutUrl={chrome.runtime.getURL("sidepanel.html")} />
          </SignedIn>
        </header>
        
        <main className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-scrollbar-thin">
          <SignedIn>
            <Router>
              <Navigation />
              <Routes>
                <Route path="/" element={<Sidebar />} />
                <Route path="/templates/new" element={<TemplateDetailsWrapper />} />
                <Route path="/templates/:id" element={<TemplateDetailsWrapper />} />
                <Route path="/variables" element={<VariablesPage />} />
              </Routes>
            </Router>
          </SignedIn>
          <SignedOut>
            <div className="plasmo-p-6 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-full">
              <div className="plasmo-card plasmo-p-4 plasmo-max-w-md plasmo-w-full">
                <div className="plasmo-text-center plasmo-mb-4">
                  <svg className="plasmo-w-10 plasmo-h-10 plasmo-mx-auto plasmo-text-primary-600 plasmo-mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.25 11.75L17.25 6.75L14.25 9.75L12.75 4.75L7.75 9.25L4.75 8.75V19.25H19.25V11.75Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.75 13.25L11.25 17.25L15.25 13.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-text-gray-900 plasmo-mb-1">Sign In to Promptier</h2>
                  <p className="plasmo-text-xs plasmo-text-gray-600">Log in to access your templates and variables</p>
                </div>
                <SignIn
                  routing="virtual"
                  appearance={{
                    elements: {
                      formButtonPrimary: 'plasmo-bg-primary-600 plasmo-hover:plasmo-bg-primary-700',
                      socialButtonsBlockButton: 'plasmo-hidden',
                      socialButtonsBlockButtonText: 'plasmo-hidden',
                      dividerRow: 'plasmo-hidden',
                      dividerText: 'plasmo-hidden',
                      formFieldInput: 'plasmo-text-sm',
                      formFieldLabel: 'plasmo-text-sm',
                      card: 'plasmo-shadow-none plasmo-border-0',
                    },
                  }}
                />
              </div>
            </div>
          </SignedOut>
        </main>
        
        {/* Toast container for notifications - fixed position */}
        <div id="toast-root" className="plasmo-fixed plasmo-top-4 plasmo-right-4 plasmo-z-50" />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </ClerkProvider>
  )
}

export default SidePanel