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
      <div className="plasmo-p-4 plasmo-text-center">
        <div className="plasmo-animate-spin plasmo-h-8 plasmo-w-8 plasmo-border-4 plasmo-border-t-blue-500 plasmo-border-r-transparent plasmo-border-b-blue-500 plasmo-border-l-transparent plasmo-rounded-full plasmo-mx-auto plasmo-mb-4"></div>
        <p>Loading template...</p>
        {fetchAttempts > 1 && (
          <p className="plasmo-text-sm plasmo-text-gray-500">
            Attempt {fetchAttempts} of {MAX_FETCH_ATTEMPTS}...
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="plasmo-p-4 plasmo-text-center">
        <div className="plasmo-text-red-600 plasmo-mb-4">
          <span className="plasmo-text-2xl">⚠️</span>
          <p className="plasmo-font-medium">{error}</p>
        </div>
        <p className="plasmo-mb-4 plasmo-text-sm plasmo-text-gray-600">
          This could be due to a network issue or a problem with the server.
        </p>
        <button
          className="plasmo-btn-secondary"
          onClick={() => navigate("/")}>
          Go Back
        </button>
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
      <div className="plasmo-p-4 plasmo-text-center">
        <div className="plasmo-text-red-600 plasmo-mb-4">
          <span className="plasmo-text-2xl">⚠️</span>
          <p className="plasmo-font-medium">Failed to load template component</p>
        </div>
        <p className="plasmo-mb-4 plasmo-text-sm plasmo-text-gray-600">
          There was an error loading the template details. This may be due to missing dependencies.
        </p>
        <pre className="plasmo-bg-gray-100 plasmo-p-2 plasmo-rounded plasmo-text-xs plasmo-mb-4 plasmo-overflow-auto plasmo-max-h-20">
          {String(err)}
        </pre>
        <button
          className="plasmo-btn-secondary"
          onClick={() => navigate("/")}>
          Go Back
        </button>
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
        <header className="plasmo-bg-white plasmo-p-4 plasmo-shadow-sleek plasmo-flex plasmo-justify-between plasmo-items-center">
          <h1 className="plasmo-text-xl plasmo-font-semibold plasmo-text-gray-900">Promptier</h1>
          <SignedIn>
            <UserButton afterSignOutUrl={chrome.runtime.getURL("sidepanel.html")} />
          </SignedIn>
        </header>
        <main className="plasmo-flex-1 plasmo-overflow-y-auto">
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
            <div className="plasmo-p-6">
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