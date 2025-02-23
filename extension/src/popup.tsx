import React from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

import './style.css'

import { RootLayout } from './popup/layouts/root-layout'
import { Home } from './popup/routes/home'
import { Settings } from './popup/routes/settings'
import { SignInPage } from './popup/routes/sign-in'
import { SignUpPage } from './popup/routes/sign-up'
import SidebarRoute from './popup/routes/sidebar'

const router = createMemoryRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/settings', element: <Settings /> },
      { path: '/sidebar', element: <SidebarRoute /> },
    ],
  },
])

function IndexPopup() {
  return <RouterProvider router={router} />
}

export default IndexPopup