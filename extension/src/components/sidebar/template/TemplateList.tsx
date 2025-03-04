import React, { useCallback, useState, useMemo, useEffect } from "react"
import type { Template } from "shared/types/templates"
import { VirtualList } from "../../common/VirtualList"
import { TemplateItem } from "./TemplateItem"
import { useTemplateKeyboardShortcuts } from "../../../hooks/useTemplateKeyboardShortcuts"
import { getCategoryClasses } from "../../../utils/category-colors"

interface TemplateListProps {
  templates?: Template[]
  favoriteTemplates?: Template[]
  onSelectTemplate: (template: Template) => void
  onFavoriteTemplate: (templateId: number) => void
  onUnfavoriteTemplate: (templateId: number) => void
  onEditTemplate: (template: Template) => void
  onDeleteTemplate: (templateId: number) => void
  isCreating?: boolean
  onCreateTemplate?: () => void
}

// Enhanced component for category filters
const CategoryFilter: React.FC<{
  categories: string[]
  selectedCategories: string[]
  onToggleCategory: (category: string) => void
}> = ({ categories, selectedCategories, onToggleCategory }) => {
  if (categories.length === 0) return null;
  
  return (
    <div className="plasmo-mb-3">
      <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1.5">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          
          return (
            <button
              key={category}
              onClick={() => onToggleCategory(category)}
              className={`
                plasmo-px-3 plasmo-py-0.5 plasmo-text-xs plasmo-font-medium 
                plasmo-rounded-full plasmo-transition-all
                ${getCategoryClasses(category, isSelected)}
                ${isSelected 
                  ? 'plasmo-shadow-sm plasmo-ring-1 plasmo-ring-opacity-50' 
                  : 'hover:plasmo-opacity-90 hover:plasmo-shadow-sm'
                }
              `}
              aria-pressed={isSelected}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const TemplateList: React.FC<TemplateListProps> = ({
  templates = [],
  favoriteTemplates = [],
  onSelectTemplate,
  onFavoriteTemplate,
  onUnfavoriteTemplate,
  onEditTemplate,
  onDeleteTemplate,
  isCreating = false,
  onCreateTemplate
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  
  // Prepare a unified list with favorites at the top
  const allTemplates = useMemo(() => {
    // Mark favorites for display
    const favs = (favoriteTemplates || []).map(t => ({ ...t, isFavorite: true }));
    
    // Filter out templates that are already in favorites to avoid duplicates
    const nonFavs = (templates || [])
      .filter(template => !favs.some(f => f.id === template.id))
      .map(template => ({ ...template }));
    
    // Return unified list with favorites at top
    return [...favs, ...nonFavs];
  }, [templates, favoriteTemplates]);

  // Extract all unique categories from templates
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    allTemplates.forEach(template => {
      if (template.category) {
        categories.add(template.category);
      }
    });
    return Array.from(categories).sort();
  }, [allTemplates]);

  // Toggle category selection
  const handleToggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);
  
  // Filter templates based on search query and selected categories
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(template => {
      // Filter by search query
      const matchesSearch = !searchQuery.trim() || 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.category && template.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by selected categories
      const matchesCategory = selectedCategories.length === 0 || 
        (template.category && selectedCategories.includes(template.category));
      
      return matchesSearch && matchesCategory;
    });
  }, [allTemplates, searchQuery, selectedCategories]);

  // Find the selected template
  const selectedTemplate = useMemo(() => {
    return allTemplates.find(t => t.id === selectedTemplateId);
  }, [allTemplates, selectedTemplateId]);

  // Handle keyboard navigation
  const handleItemFocus = useCallback((template: Template) => {
    setSelectedTemplateId(template.id)
  }, [])

  // Handle template editing
  const handleEditTemplate = useCallback((template: Template) => {
    setIsEditing(true)
    onEditTemplate(template)
  }, [onEditTemplate])

  // Handle template deletion
  const handleDeleteTemplate = useCallback((templateId: number) => {
    console.log(`[TemplateList] Deleting template ID: ${templateId}`)
    onDeleteTemplate(templateId)
  }, [onDeleteTemplate])
  
  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);
  
  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedCategories([]);
  }, []);

  // Setup keyboard shortcuts
  const { shortcuts } = useTemplateKeyboardShortcuts({
    onCreateTemplate,
    onEditTemplate: handleEditTemplate,
    onFavoriteTemplate,
    onUnfavoriteTemplate,
    onDeleteTemplate: handleDeleteTemplate,
    onSelectTemplate,
    selectedTemplate,
    isEditing,
    isCreating
  })

  // Render a template item
  const renderTemplateItem = useCallback((template: Template, index: number) => {
    // Prepare the template to highlight search matches if needed
    let highlightedTemplate = { ...template };
    
    if (searchQuery.trim()) {
      // Create a version of the name with highlighted matches
      // This is just metadata; the actual highlighting happens in the TemplateItem component
      highlightedTemplate._searchHighlight = {
        query: searchQuery.toLowerCase(),
        matchesName: template.name.toLowerCase().includes(searchQuery.toLowerCase()),
        matchesContent: template.content.toLowerCase().includes(searchQuery.toLowerCase()),
        matchesCategory: template.category?.toLowerCase().includes(searchQuery.toLowerCase()) || false
      };
    }
    
    return (
      <div className="plasmo-mb-1">
        <TemplateItem
          key={template.id}
          template={highlightedTemplate}
          isFavorite={template.isFavorite}
          isSelected={template.id === selectedTemplateId}
          index={index}
          onSelect={(template) => {
            setSelectedTemplateId(template.id)
            onSelectTemplate(template)
          }}
          onFavorite={onFavoriteTemplate}
          onUnfavorite={onUnfavoriteTemplate}
          onEdit={onEditTemplate}
          onDelete={handleDeleteTemplate}
          searchQuery={searchQuery}
        />
      </div>
    )
  }, [selectedTemplateId, onSelectTemplate, onFavoriteTemplate, onUnfavoriteTemplate, onEditTemplate, handleDeleteTemplate, searchQuery])

  // If no templates
  if (allTemplates.length === 0) {
    return (
      <div className="plasmo-empty-state plasmo-w-full">
        <div className="plasmo-text-gray-400 plasmo-mb-2">
          <svg className="plasmo-w-10 plasmo-h-10 plasmo-mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="plasmo-text-lg plasmo-font-medium plasmo-text-gray-900 plasmo-mb-2">No templates yet</h3>
        <p className="plasmo-text-sm plasmo-text-gray-500 plasmo-mb-3">
          Create your first template to get started with reusable prompts.
        </p>
        <button
          className="plasmo-btn-primary"
          onClick={onCreateTemplate}
        >
          Create Your First Template
        </button>
      </div>
    );
  }

  return (
    <div className="plasmo-space-y-1 plasmo-w-full">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-1">
        <div className="plasmo-text-xs plasmo-text-gray-500">
          {allTemplates.length} template{allTemplates.length !== 1 ? 's' : ''}
          {selectedCategories.length > 0 && ` • ${filteredTemplates.length} filtered`}
        </div>
        <button
          className="plasmo-btn-primary plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-text-xs"
          onClick={onCreateTemplate}
          aria-label="Create new template"
        >
          <svg
            className="plasmo-w-3.5 plasmo-h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New
        </button>
      </div>
      
      {/* Category filter */}
      <CategoryFilter 
        categories={availableCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
      />
      
      {/* Search Bar */}
      <div className="plasmo-relative plasmo-mb-2">
        <div className="plasmo-absolute plasmo-inset-y-0 plasmo-left-0 plasmo-pl-3 plasmo-flex plasmo-items-center plasmo-pointer-events-none">
          <svg
            className="plasmo-h-4 plasmo-w-4 plasmo-text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          className="plasmo-block plasmo-w-full plasmo-pl-10 plasmo-pr-8 plasmo-py-1.5 plasmo-text-sm plasmo-bg-gray-100 plasmo-border plasmo-border-gray-200 plasmo-rounded-md placeholder-gray-400 focus:plasmo-outline-none focus:plasmo-ring-1 focus:plasmo-ring-primary-500 focus:plasmo-border-primary-500"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search templates"
        />
        {(searchQuery || selectedCategories.length > 0) && (
          <button
            className="plasmo-absolute plasmo-inset-y-0 plasmo-right-0 plasmo-pr-3 plasmo-flex plasmo-items-center"
            onClick={handleClearSearch}
            aria-label="Clear search and filters"
          >
            <svg
              className="plasmo-h-4 plasmo-w-4 plasmo-text-gray-400 hover:plasmo-text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Template List */}
      <div className="plasmo-space-y-0.5 plasmo-w-full">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template, index) => renderTemplateItem(template, index))
        ) : (
          <div className="plasmo-text-center plasmo-py-4 plasmo-text-sm plasmo-text-gray-500">
            No templates match your search
            {selectedCategories.length > 0 && " and category filters"}
          </div>
        )}
      </div>
    </div>
  );
} 