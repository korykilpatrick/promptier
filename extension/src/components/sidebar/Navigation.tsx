const React = require("react");
const reactRouterDom = require("react-router-dom");
const { useNavigate, useLocation } = reactRouterDom;

/**
 * @typedef {Object} NavItem
 * @property {string} id - Unique identifier
 * @property {string} label - Display text
 * @property {string} path - Route path
 * @property {string} icon - SVG icon code
 */

/**
 * Navigation component for the sidebar
 * @returns {JSX.Element} Rendered component
 */
function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  /** @type {NavItem[]} */
  const navItems = [
    {
      id: 'templates',
      label: 'Templates',
      path: '/',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />`
    },
    {
      id: 'variables',
      label: 'Variables',
      path: '/variables',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />`
    }
  ];
  
  const handleNavClick = (path) => {
    navigate(path);
  };
  
  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <nav className="plasmo-bg-white plasmo-border-b plasmo-border-gray-200">
      <div className="plasmo-flex plasmo-items-center">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.path)}
            className={`
              plasmo-flex plasmo-items-center plasmo-px-4 plasmo-py-3 plasmo-flex-1
              plasmo-text-sm plasmo-font-medium plasmo-transition-colors
              ${isActivePath(item.path) 
                ? 'plasmo-text-blue-600 plasmo-border-b-2 plasmo-border-blue-600' 
                : 'plasmo-text-gray-600 hover:plasmo-text-gray-900 hover:plasmo-bg-gray-50'
              }
            `}
            aria-current={isActivePath(item.path) ? 'page' : undefined}
          >
            <svg 
              className="plasmo-w-5 plasmo-h-5 plasmo-mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

module.exports = { Navigation }; 