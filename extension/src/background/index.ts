import { createClerkClient } from '@clerk/chrome-extension/background'

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000'

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

// Create a Clerk client and get a fresh token
async function getToken() {
  const clerk = await createClerkClient({
    publishableKey: PUBLISHABLE_KEY,
  })

  // If there is no valid session, return null
  if (!clerk.session) {
    return null
  }

  // Return the user's session token
  return await clerk.session.getToken()
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle different types of requests
  switch (request.type) {
    case 'GET_TOKEN':
      getToken()
        .then((token) => sendResponse({ token }))
        .catch((error) => {
          console.error('[Background] Error getting token:', error)
          sendResponse({ token: null, error: error.message })
        })
      break

    case 'MAKE_API_REQUEST':
      // Get a fresh token and make an API request
      getToken()
        .then(async (token) => {
          if (!token) {
            sendResponse({ error: 'No valid session' })
            return
          }

          try {
            const apiUrl = new URL(request.url, API_BASE_URL).toString()
            const response = await fetch(apiUrl, {
              method: request.method || 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...request.headers,
              },
              body: request.body ? JSON.stringify(request.body) : undefined,
            })

            const responseData = await response.json()
            
            if (!response.ok) {
              sendResponse({ 
                error: responseData.error || `HTTP error! status: ${response.status}`
              })
              return
            }

            sendResponse({ data: responseData.data })
          } catch (error) {
            console.error('[Background] API request error:', error)
            sendResponse({ error: error.message })
          }
        })
        .catch((error) => {
          console.error('[Background] Error making API request:', error)
          sendResponse({ error: error.message })
        })
      break

    default:
      console.warn('[Background] Unknown message type:', request.type)
      sendResponse({ error: 'Unknown message type' })
  }

  // Return true to indicate we'll respond asynchronously
  return true
}) 