import React from "react";
import { Link, useLocation } from "react-router-dom";

export const Navigation: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route: string) => {
    return path === route || (route !== "/" && path.startsWith(route));
  };

  return (
    <nav className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200 plasmo-px-3 plasmo-py-1">
      <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
        <div className="plasmo-flex plasmo-items-center plasmo-space-x-1">
          <Link
            to="/"
            className={`plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-rounded-md plasmo-font-medium plasmo-transition-colors
              ${isActive("/")
                ? "plasmo-text-primary-700 plasmo-bg-primary-50"
                : "plasmo-text-gray-600 hover:plasmo-text-gray-800 hover:plasmo-bg-gray-50"
              }`}
          >
            Templates
          </Link>
          <Link
            to="/variables"
            className={`plasmo-px-3 plasmo-py-1.5 plasmo-text-sm plasmo-rounded-md plasmo-font-medium plasmo-transition-colors
              ${isActive("/variables")
                ? "plasmo-text-primary-700 plasmo-bg-primary-50"
                : "plasmo-text-gray-600 hover:plasmo-text-gray-800 hover:plasmo-bg-gray-50"
              }`}
          >
            Variables
          </Link>
        </div>
      </div>
    </nav>
  );
};