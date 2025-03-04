/**
 * Utility for managing consistent category colors across the application
 */

// Define color schemes for categories with background, selected background, and text colors
export interface CategoryColorScheme {
  bg: string;
  bgSelected: string;
  text: string;
  textSelected: string;
  border: string;  // Added border for unselected state
}

// Array of color options to use for dynamically generating category colors
// Enhanced with more vibrant colors, borders, and better contrast
const COLOR_OPTIONS: CategoryColorScheme[] = [
  { bg: 'plasmo-bg-red-100', bgSelected: 'plasmo-bg-red-600', text: 'plasmo-text-red-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-red-300' },
  { bg: 'plasmo-bg-blue-100', bgSelected: 'plasmo-bg-blue-600', text: 'plasmo-text-blue-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-blue-300' },
  { bg: 'plasmo-bg-green-100', bgSelected: 'plasmo-bg-green-600', text: 'plasmo-text-green-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-green-300' },
  { bg: 'plasmo-bg-purple-100', bgSelected: 'plasmo-bg-purple-600', text: 'plasmo-text-purple-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-purple-300' },
  { bg: 'plasmo-bg-yellow-100', bgSelected: 'plasmo-bg-yellow-500', text: 'plasmo-text-yellow-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-yellow-300' },
  { bg: 'plasmo-bg-pink-100', bgSelected: 'plasmo-bg-pink-600', text: 'plasmo-text-pink-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-pink-300' },
  { bg: 'plasmo-bg-indigo-100', bgSelected: 'plasmo-bg-indigo-600', text: 'plasmo-text-indigo-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-indigo-300' },
  { bg: 'plasmo-bg-teal-100', bgSelected: 'plasmo-bg-teal-600', text: 'plasmo-text-teal-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-teal-300' },
  { bg: 'plasmo-bg-orange-100', bgSelected: 'plasmo-bg-orange-600', text: 'plasmo-text-orange-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-orange-300' },
  { bg: 'plasmo-bg-amber-100', bgSelected: 'plasmo-bg-amber-600', text: 'plasmo-text-amber-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-amber-300' },
  { bg: 'plasmo-bg-lime-100', bgSelected: 'plasmo-bg-lime-600', text: 'plasmo-text-lime-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-lime-300' },
  { bg: 'plasmo-bg-emerald-100', bgSelected: 'plasmo-bg-emerald-600', text: 'plasmo-text-emerald-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-emerald-300' },
  { bg: 'plasmo-bg-cyan-100', bgSelected: 'plasmo-bg-cyan-600', text: 'plasmo-text-cyan-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-cyan-300' },
  { bg: 'plasmo-bg-sky-100', bgSelected: 'plasmo-bg-sky-600', text: 'plasmo-text-sky-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-sky-300' },
  { bg: 'plasmo-bg-violet-100', bgSelected: 'plasmo-bg-violet-600', text: 'plasmo-text-violet-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-violet-300' },
  { bg: 'plasmo-bg-fuchsia-100', bgSelected: 'plasmo-bg-fuchsia-600', text: 'plasmo-text-fuchsia-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-fuchsia-300' },
  { bg: 'plasmo-bg-rose-100', bgSelected: 'plasmo-bg-rose-600', text: 'plasmo-text-rose-800', textSelected: 'plasmo-text-white', border: 'plasmo-border-rose-300' },
];

// Track which categories have been assigned which color indices (for the current session only)
const categoryColorMap = new Map<string, number>();
let nextColorIndex = 0;

/**
 * Generate a hash code from a string
 * This is used to deterministically map a category name to a color
 */
function hashString(str: string): number {
  // Use a prime number to improve distribution
  let hash = 17;
  
  for (let i = 0; i < str.length; i++) {
    // Multiply by another prime (31) and add character code
    hash = (hash * 31) + str.charCodeAt(i);
  }
  
  return Math.abs(hash);
}

/**
 * Get color scheme for a category
 * @param category - The category name
 * @returns The color scheme object with background, selected background, and text colors
 */
export function getCategoryColorScheme(category: string): CategoryColorScheme {
  const lowerCaseCategory = category.toLowerCase();
  
  // Check if this category already has a color assigned in this session
  if (!categoryColorMap.has(lowerCaseCategory)) {
    // Assign the next available color
    categoryColorMap.set(lowerCaseCategory, nextColorIndex);
    // Update nextColorIndex, wrapping around if we reach the end of available colors
    nextColorIndex = (nextColorIndex + 1) % COLOR_OPTIONS.length;
  }
  
  // Get the assigned color index for this category
  const colorIndex = categoryColorMap.get(lowerCaseCategory)!;
  
  return COLOR_OPTIONS[colorIndex];
}

/**
 * Get CSS class names for a category tag
 * @param category - The category name  
 * @param isSelected - Whether the category is selected
 * @returns A string of CSS classes for the category tag
 */
export function getCategoryClasses(category: string, isSelected: boolean = false): string {
  const colors = getCategoryColorScheme(category);
  
  return isSelected
    ? `${colors.bgSelected} ${colors.textSelected} plasmo-border plasmo-border-transparent`
    : `${colors.bg} ${colors.text} plasmo-border ${colors.border}`;
} 