import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Templates",
      icon: (
        <svg className="plasmo-w-5 plasmo-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      path: "/variables",
      label: "Variables",
      icon: (
        <svg className="plasmo-w-5 plasmo-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/templates");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-shadow-sm">
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={`
              plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-2
              plasmo-px-4 plasmo-py-3 plasmo-flex-1 plasmo-text-sm plasmo-font-medium
              plasmo-transition-colors plasmo-duration-200
              ${isActivePath(item.path) 
                ? "plasmo-text-primary-700 plasmo-border-b-2 plasmo-border-primary-500 plasmo-bg-primary-50"
                : "plasmo-text-gray-500 hover:plasmo-text-gray-700 hover:plasmo-bg-gray-50"
              }
            `}
            aria-current={isActivePath(item.path) ? "page" : undefined}
          >
            <span className={`${isActivePath(item.path) ? "plasmo-text-primary-600" : "plasmo-text-gray-400"}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};