import React from "react"
import { Sidebar } from "~components/sidebar/Sidebar"

const SidebarView: React.FC = () => {
  return (
    <main 
      className="min-h-screen bg-gray-50 flex justify-center items-start p-4"
      role="main"
      aria-label="Promptier Sidebar"
    >
      <div 
        className="w-[400px] min-h-[600px] max-h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
        style={{
          height: "calc(100vh - 2rem)" // Subtract padding
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