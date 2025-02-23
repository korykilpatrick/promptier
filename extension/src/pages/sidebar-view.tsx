import React from "react"
import { Sidebar } from "~components/sidebar/Sidebar"

const SidebarView: React.FC = () => {
  return (
    <main 
      className="plasmo-min-h-screen plasmo-bg-gray-50 plasmo-flex plasmo-justify-center plasmo-items-start plasmo-p-4"
      role="main"
      aria-label="Promptier Sidebar"
    >
      <div 
        className="plasmo-w-[480px] plasmo-bg-white plasmo-rounded-lg plasmo-shadow-lg plasmo-overflow-hidden plasmo-border plasmo-border-gray-200"
        style={{
          height: "calc(100vh - 2rem)", // Subtract padding
          maxHeight: "90vh"
        }}
        role="region"
        aria-label="Template and Chain Management"
      >
        <Sidebar />
      </div>
    </main>
  )
}

export default SidebarView 