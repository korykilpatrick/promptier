import { createClerkClient } from '@clerk/chrome-extension/background'

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

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

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }, () => {
    console.log('Side panel opened for tab:', tab.id)
  })
})

// Listen for messages from content scripts or side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      getToken()
        .then(async (token) => {
          if (!token) {
            sendResponse({ error: 'No valid session' })
            return
          }

          try {
            const response = await fetch(request.url, {
              method: request.method || 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...request.headers,
              },
              body: request.body ? JSON.stringify(request.body) : undefined,
            })

            const data = await response.json()
            sendResponse({ data })
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

  return true // Indicates asynchronous response
}) 