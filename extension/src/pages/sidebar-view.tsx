import React from "react"
import { Sidebar } from "~components/sidebar/Sidebar"

const SidebarView: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-gray-100 flex justify-center items-center p-4">
      <div className="w-[400px] h-full bg-white rounded-lg shadow-lg overflow-hidden">
        <Sidebar />
      </div>
    </div>
  )
}

export default SidebarView 