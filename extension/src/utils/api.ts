type ApiRequestOptions = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

type ApiResponse<T = any> = {
  data?: T
  error?: string
}

/**
 * Makes an authenticated API request through the background service worker
 * This ensures we always have a fresh token and proper error handling
 */
export async function makeApiRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'MAKE_API_REQUEST',
        ...options,
      },
      (response: ApiResponse<T>) => {
        resolve(response)
      },
    )
  })
}

/**
 * Gets a fresh authentication token from the background service worker
 * Useful when you need to make authenticated requests directly
 */
export async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, (response) => {
      resolve(response.token)
    })
  })
} 