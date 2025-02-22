import React from 'react'
import { SignUp } from '@clerk/chrome-extension'

export const SignUpPage = () => {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center">
      <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-mb-4">Sign Up</h1>
      <SignUp 
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