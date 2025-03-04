import React from "react"
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from "@clerk/chrome-extension"
import { MemoryRouter as Router, Routes, Route, useNavigate, useParams } from "react-router-dom"
import { Sidebar } from "~components/sidebar/Sidebar"
import { TemplateDetails } from "~components/sidebar/template/TemplateDetails"
import { ToastContainer } from "~components/common/Toast"
import { useToast } from "~hooks/useToast"
import "./style.css"
import VariablesPage from "~components/sidebar/variables/VariablesPage"
import { Navigation } from "~components/sidebar/Navigation"
import { useTemplates } from "~hooks/useTemplates"
import { useState, useEffect, useMemo, useCallback } from "react"
import { makeApiRequest } from "~utils/api"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file")
}

// Wrapper component to fetch template by ID and pass it to TemplateDetails
function TemplateDetailsWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toastUtils = useToast();
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [timeoutId, setTimeoutId] = useState(null);
  
  // Add interface for attempt details
  interface AttemptDetail {
    time: string;
    error: string;
    source: string;
  }
  
  const [failedAttemptDetails, setFailedAttemptDetails] = useState<AttemptDetail[]>([]);
  const [isDirectAttempt, setIsDirectAttempt] = useState(false);

  // Clear timeout when component unmounts or when id changes
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Reset states when template ID changes
  useEffect(() => {
    setFetchAttempts(0);
    setError("");
    setFailedAttemptDetails([]);
    setIsDirectAttempt(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [id]);

  // Hook into useTemplates for fetching
  const options = useMemo(() => ({
    onError: (error) => {
      console.error("[TemplateDetailsWrapper] Error from useTemplates:", error);
      setFailedAttemptDetails(prev => [...prev, {
        time: new Date().toISOString(),
        error: error.message || 'Unknown error',
        source: 'useTemplates hook'
      }]);
    },
    maxRetries: 2,
  }), []);

  const { templates, fetchTemplates } = useTemplates({ toast: toastUtils, options });

  // Define constants
  const MAX_FETCH_ATTEMPTS = 3;
  const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

  // Helper function to create a promise that rejects after a timeout
  const createTimeoutPromise = (ms) => {
    return new Promise((_, reject) => {
      const id = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
      setTimeoutId(id);
      return id;
    });
  };

  // Try to fetch directly if the normal flow fails
  const fetchTemplatesDirectly = async () => {
    console.log("[TemplateDetailsWrapper] Attempting direct API call to fetch templates");
    setIsDirectAttempt(true);
    
    try {
      // Use the makeApiRequest utility directly
      const response = await makeApiRequest({
        url: "/templates",
        method: "GET"
      });
      
      console.log("[TemplateDetailsWrapper] Direct API call response:", response);
      
      if (response.error) {
        throw new Error(`API error: ${response.error}`);
      }
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid data format received");
      }
      
      return response.data.map(template => ({
        id: template.id,
        name: template.name,
        content: template.template_text,
        category: template.category || "",
        isFavorite: template.is_favorite,
        createdAt: new Date(template.created_at).toISOString()
      }));
    } catch (error) {
      console.error("[TemplateDetailsWrapper] Direct API call failed:", error);
      setFailedAttemptDetails(prev => [...prev, {
        time: new Date().toISOString(),
        error: error.message || 'Unknown error',
        source: 'direct API call'
      }]);
      throw error;
    }
  };

  // Main template loading function
  const loadTemplate = useCallback(async () => {
    if (isLoading) return;
    
    if (!id) {
      // Creating a new template
      console.log("[TemplateDetailsWrapper] No template ID provided, assuming new template creation");
      setTemplate(null);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`[TemplateDetailsWrapper] Loading template with ID: ${id} (type: ${typeof id})`);
      
      // Check if templates are already loaded
      if (templates && templates.length > 0) {
        console.log(`[TemplateDetailsWrapper] Using ${templates.length} already loaded templates:`, 
          templates.map(t => ({ id: t.id, name: t.name, idType: typeof t.id })));
        
        // Find template by ID (try both number and string comparison)
        const templateIdNum = Number(id);
        const foundTemplate = templates.find(t => 
          t.id === templateIdNum || t.id === id || String(t.id) === String(id)
        );
        
        if (foundTemplate) {
          console.log(`[TemplateDetailsWrapper] Found template: ${foundTemplate.name} (ID: ${foundTemplate.id}, type: ${typeof foundTemplate.id})`);
          console.log(`[TemplateDetailsWrapper] Template details:`, JSON.stringify(foundTemplate, null, 2));
          setTemplate(foundTemplate);
          setIsLoading(false);
          return;
        }
        
        console.log(`[TemplateDetailsWrapper] Template not found in loaded templates, will fetch from server. ID comparison: ${
          templates.map(t => `${t.id}(${typeof t.id}) === ${id}(${typeof id})? ${t.id === id}`).join(', ')
        }`);
      }
      
      const newAttempt = fetchAttempts + 1;
      setFetchAttempts(newAttempt);
      
      if (newAttempt <= MAX_FETCH_ATTEMPTS) {
        console.log(`[TemplateDetailsWrapper] Fetching templates attempt ${newAttempt} of ${MAX_FETCH_ATTEMPTS}`);
        
        try {
          // Create a promise that rejects after timeout
          const timeoutPromise = createTimeoutPromise(FETCH_TIMEOUT_MS);
          
          // Try fetchTemplates from useTemplates hook first, or direct API call if we're on the last attempt
          const fetchPromise = newAttempt === MAX_FETCH_ATTEMPTS && !isDirectAttempt
            ? fetchTemplatesDirectly()
            : fetchTemplates();
          
          console.log(`[TemplateDetailsWrapper] Starting fetch (${newAttempt === MAX_FETCH_ATTEMPTS && !isDirectAttempt ? 'direct' : 'hook'})`);
          
          // Race between the fetch and the timeout
          const fetchedTemplates = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
          }
          
          if (!fetchedTemplates || !Array.isArray(fetchedTemplates) || fetchedTemplates.length === 0) {
            console.warn(`[TemplateDetailsWrapper] No templates received on attempt ${newAttempt}`);
            throw new Error("No templates found");
          }
          
          console.log(`[TemplateDetailsWrapper] Received ${fetchedTemplates.length} templates:`, 
            fetchedTemplates.map(t => ({ id: t.id, name: t.name, idType: typeof t.id })));
          
          // Find template by ID (try both number and string comparison)
          const templateIdNum = Number(id);
          const foundTemplate = fetchedTemplates.find(t => 
            t.id === templateIdNum || t.id === id || String(t.id) === String(id)
          );
          
          if (foundTemplate) {
            console.log(`[TemplateDetailsWrapper] Found template: ${foundTemplate.name} (ID: ${foundTemplate.id}, type: ${typeof foundTemplate.id})`);
            console.log(`[TemplateDetailsWrapper] Template details:`, JSON.stringify(foundTemplate, null, 2));
            setTemplate(foundTemplate);
            setIsLoading(false);
          } else {
            console.error(`[TemplateDetailsWrapper] Template with ID ${id} not found in fetched templates. ID comparison: ${
              fetchedTemplates.map(t => `${t.id}(${typeof t.id}) === ${id}(${typeof id})? ${t.id === id}`).join(', ')
            }`);
            throw new Error(`Template with ID ${id} not found`);
          }
          
        } catch (fetchError) {
          console.error("[TemplateDetailsWrapper] Error fetching templates:", fetchError);
          
          if (newAttempt < MAX_FETCH_ATTEMPTS || (newAttempt === MAX_FETCH_ATTEMPTS && !isDirectAttempt)) {
            // If we haven't reached max attempts or haven't tried direct API call yet
            console.log(`[TemplateDetailsWrapper] Scheduling retry in 1 second (attempt ${newAttempt})`);
            const retryId = setTimeout(() => {
              loadTemplate();
            }, 1000);
            setTimeoutId(retryId);
          } else {
            // Max attempts reached, show error
            const errorMessage = `Error Loading Template: Failed to load templates after ${MAX_FETCH_ATTEMPTS} attempts`;
            setError(errorMessage);
            setIsLoading(false);
            console.error("[TemplateDetailsWrapper] All attempts failed:", failedAttemptDetails);
          }
        }
      } else {
        // Max attempts reached
        const errorMessage = `Error Loading Template: Failed to load templates after ${MAX_FETCH_ATTEMPTS} attempts`;
        setError(errorMessage);
        setIsLoading(false);
        console.error("[TemplateDetailsWrapper] All attempts failed:", failedAttemptDetails);
      }
    } catch (error) {
      console.error("[TemplateDetailsWrapper] Unexpected error:", error);
      setError(`Error Loading Template: ${error.message}`);
      setIsLoading(false);
    }
  }, [
    id, 
    templates, 
    fetchAttempts, 
    MAX_FETCH_ATTEMPTS, 
    timeoutId, 
    isLoading, 
    fetchTemplates,
    failedAttemptDetails,
    isDirectAttempt
  ]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  if (isLoading) {
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-h-full">
        <div className="plasmo-text-center">
          <div className="plasmo-animate-spin plasmo-h-8 plasmo-w-8 plasmo-border-3 plasmo-border-primary-200 plasmo-border-t-primary-600 plasmo-rounded-full plasmo-mx-auto plasmo-mb-3"></div>
          <p className="plasmo-text-gray-700 plasmo-text-sm">Loading template...</p>
          {fetchAttempts > 1 && (
            <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-mt-1">
              Attempt {fetchAttempts} of {MAX_FETCH_ATTEMPTS}...
            </p>
          )}
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
          <p className="plasmo-mb-3 plasmo-text-sm plasmo-text-gray-600">
            This could be due to a network issue or a problem with the server.
          </p>
          <button
            className="plasmo-btn-primary plasmo-w-full"
            onClick={() => navigate("/")}>
            Return to Template List
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <TemplateDetails 
        template={template} 
        onBack={() => navigate("/")} 
        onTemplateChange={(updatedTemplate) => setTemplate(updatedTemplate)}
      />
    );
  } catch (err) {
    console.error("Error rendering TemplateDetails:", err);
    return (
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-h-full">
        <div className="plasmo-card plasmo-p-4 plasmo-max-w-md plasmo-w-full plasmo-text-center">
          <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-w-10 plasmo-h-10 plasmo-mx-auto plasmo-rounded-full plasmo-bg-error-100 plasmo-text-error-600 plasmo-mb-3">
            <svg className="plasmo-w-5 plasmo-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="plasmo-text-base plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">Failed to load template component</h3>
          <p className="plasmo-mb-3 plasmo-text-sm plasmo-text-gray-600">
            There was an error loading the template details.
          </p>
          <pre className="plasmo-bg-gray-100 plasmo-p-2 plasmo-rounded plasmo-text-xs plasmo-mb-3 plasmo-overflow-auto plasmo-max-h-32 plasmo-text-left">
            {String(err)}
          </pre>
          <button
            className="plasmo-btn-primary plasmo-w-full"
            onClick={() => navigate("/")}>
            Return to Template List
          </button>
        </div>
      </div>
    );
  }
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