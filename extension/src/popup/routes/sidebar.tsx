import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@clerk/chrome-extension"
import SidebarView from "~pages/sidebar-view"
import { LoadingState } from "~components/common/LoadingState"
import { ErrorBoundary } from "~components/common/ErrorBoundary"

const SidebarRoute: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    // Redirect to sign in if not authenticated
    if (isLoaded && !isSignedIn && mounted) {
      navigate("/sign-in", { replace: true })
    }

    return () => {
      mounted = false
    }
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded) {
    return <LoadingState fullScreen message="Loading your account..." />
  }

  if (!isSignedIn) {
    return <LoadingState fullScreen message="Redirecting to sign in..." />
  }

  return (
    <ErrorBoundary>
      <SidebarView />
    </ErrorBoundary>
  )
}

export default SidebarRoute 