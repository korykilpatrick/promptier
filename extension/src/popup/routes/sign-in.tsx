import React from 'react'
import { SignIn } from '@clerk/chrome-extension'

export const SignInPage = () => {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center">
      <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-mb-4">Sign In</h1>
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
  )
} 