// Template Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Template } from 'shared/types/templates';

interface TemplateState {
  list: Template[];
  favoriteList: Template[];
  editingTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TemplateState = {
  list: [],
  favoriteList: [],
  editingTemplate: null,
  isLoading: false,
  error: null
};

export const templateSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    // Set the template being edited
    setEditingTemplate: (state, action: PayloadAction<Template | null>) => {
      state.editingTemplate = action.payload;
    },
    
    // Set templates list
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.list = action.payload;
    },
    
    // Set favorite templates list
    setFavoriteTemplates: (state, action: PayloadAction<Template[]>) => {
      state.favoriteList = action.payload;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

// Export actions
export const { 
  setEditingTemplate, 
  setTemplates, 
  setFavoriteTemplates, 
  setLoading, 
  setError 
} = templateSlice.actions;

// Export selector functions
export const selectTemplates = (state: { templates: TemplateState }) => state.templates.list;
export const selectFavoriteTemplates = (state: { templates: TemplateState }) => state.templates.favoriteList;
export const selectEditingTemplate = (state: { templates: TemplateState }) => state.templates.editingTemplate;
export const selectIsLoading = (state: { templates: TemplateState }) => state.templates.isLoading;
export const selectError = (state: { templates: TemplateState }) => state.templates.error;

export default templateSlice.reducer; 