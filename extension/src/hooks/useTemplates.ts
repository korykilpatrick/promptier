import { useState, useCallback, useEffect } from "react";
import type { Template, TemplateRequest, TemplateResponse } from "../../../shared/types/templates";
import { toFrontendTemplate, toBackendTemplate } from "../../../shared/types/templates";
import type { Toast } from "~components/common/Toast";
import { useToast } from "~hooks/useToast";
import { makeApiRequest } from "~utils/api";

interface UseTemplatesOptions {
  onError?: (error: Error) => void;
  maxRetries?: number;
  debounceDelay?: number;
}

interface UseTemplatesProps {
  toast: ReturnType<typeof useToast>;
  options?: UseTemplatesOptions;
}

interface OperationState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

interface UseTemplatesReturn {
  templates: Template[];
  favoriteTemplates: Template[];
  operationStates: Record<string, OperationState>;
  fetchTemplates: () => Promise<Template[]>;
  createTemplate: (data: Omit<Template, "id" | "createdAt" | "isFavorite">) => Promise<Template>;
  updateTemplate: (data: Partial<Template> & { id: number }) => Promise<Template>;
  deleteTemplate: (id: number) => Promise<void>;
  favoriteTemplate: (id: number) => Promise<void>;
  unfavoriteTemplate: (id: number) => Promise<void>;
  cleanup: () => void;
}

export function useTemplates({ toast, options = {} }: UseTemplatesProps): UseTemplatesReturn {
  const { maxRetries = 3, debounceDelay = 300 } = options;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [favoriteTemplates, setFavoriteTemplates] = useState<Template[]>([]);
  const [operationStates, setOperationStates] = useState<Record<string, OperationState>>({
    fetch: { isLoading: true, error: null, retryCount: 0 },
    create: { isLoading: false, error: null, retryCount: 0 },
    update: { isLoading: false, error: null, retryCount: 0 },
    delete: { isLoading: false, error: null, retryCount: 0 }
  });

  const setOperationState = useCallback((operation: string, state: Partial<OperationState>) => {
    setOperationStates((prev) => ({
      ...prev,
      [operation]: {
        ...prev[operation],
        ...state
      }
    }));
  }, []);

  const cleanup = useCallback(() => {
    // No cleanup needed for API-based implementation
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const fetchTemplates = useCallback(async () => {
    try {
      console.log('Fetching templates...');
      setOperationState("fetch", { isLoading: true, error: null });
      
      const response = await makeApiRequest<TemplateResponse[]>({
        url: "/templates",
        method: "GET"
      });

      console.log('Templates response:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("No data received from server");
      }

      const allTemplates = response.data.map(toFrontendTemplate);
      console.log('Transformed templates:', allTemplates);
      
      setTemplates(allTemplates.filter((t) => !t.isFavorite));
      setFavoriteTemplates(allTemplates.filter((t) => t.isFavorite));
      setOperationState("fetch", { isLoading: false, error: null });
      return allTemplates;
    } catch (err) {
      console.error('Error in fetchTemplates:', err);
      const error = err instanceof Error ? err : new Error("Failed to load templates");
      setOperationState("fetch", { isLoading: false, error });
      setTemplates([]);
      setFavoriteTemplates([]);
      options.onError?.(error);
      toast.error("Failed to load templates");
      return [];
    }
  }, [setOperationState, options, toast]);

  const createTemplate = useCallback(async (data: Omit<Template, "id" | "createdAt" | "isFavorite">) => {
    try {
      setOperationState("create", { isLoading: true, error: null });
      
      const response = await makeApiRequest<TemplateResponse>({
        url: "/templates",
        method: "POST",
        body: toBackendTemplate(data)
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("No data received from server");
      }

      const newTemplate = toFrontendTemplate(response.data);
      if (newTemplate.isFavorite) {
        setFavoriteTemplates((prev) => [...prev, newTemplate]);
      } else {
        setTemplates((prev) => [...prev, newTemplate]);
      }

      setOperationState("create", { isLoading: false, error: null });
      toast.success("Template created successfully");
      return newTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create template");
      setOperationState("create", { isLoading: false, error });
      options.onError?.(error);
      toast.error("Failed to create template");
      throw error;
    }
  }, [setOperationState, options, toast]);

  const updateTemplate = useCallback(async (data: Partial<Template> & { id: number }) => {
    try {
      setOperationState("update", { isLoading: true, error: null });
      
      const response = await makeApiRequest<TemplateResponse>({
        url: `/templates/${data.id}`,
        method: "PUT",
        body: toBackendTemplate(data)
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("No data received from server");
      }

      const updatedTemplate = toFrontendTemplate(response.data);
      const updateTemplateList = (list: Template[]) =>
        list.map((t) => (t.id === data.id ? updatedTemplate : t));

      if (updatedTemplate.isFavorite) {
        setFavoriteTemplates((prev) => updateTemplateList(prev));
        setTemplates((prev) => prev.filter((t) => t.id !== data.id));
      } else {
        setTemplates((prev) => updateTemplateList(prev));
        setFavoriteTemplates((prev) => prev.filter((t) => t.id !== data.id));
      }

      setOperationState("update", { isLoading: false, error: null });
      toast.success("Template updated successfully");
      return updatedTemplate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update template");
      setOperationState("update", { isLoading: false, error });
      options.onError?.(error);
      toast.error("Failed to update template");
      throw error;
    }
  }, [setOperationState, options, toast]);

  const deleteTemplate = useCallback(async (id: number) => {
    try {
      setOperationState("delete", { isLoading: true, error: null });
      
      const response = await makeApiRequest({
        url: `/templates/${id}`,
        method: "DELETE"
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setFavoriteTemplates((prev) => prev.filter((t) => t.id !== id));
      setOperationState("delete", { isLoading: false, error: null });
      toast.success("Template deleted successfully");
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete template");
      setOperationState("delete", { isLoading: false, error });
      options.onError?.(error);
      toast.error("Failed to delete template");
      throw error;
    }
  }, [setOperationState, options, toast]);

  const favoriteTemplate = useCallback(async (id: number) => {
    const template = [...templates, ...favoriteTemplates].find((t) => t.id === id);
    if (!template) throw new Error("Template not found");
    await updateTemplate({ id, isFavorite: true });
  }, [templates, favoriteTemplates, updateTemplate]);

  const unfavoriteTemplate = useCallback(async (id: number) => {
    const template = [...templates, ...favoriteTemplates].find((t) => t.id === id);
    if (!template) throw new Error("Template not found");
    await updateTemplate({ id, isFavorite: false });
  }, [templates, favoriteTemplates, updateTemplate]);

  return {
    templates,
    favoriteTemplates,
    operationStates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    favoriteTemplate,
    unfavoriteTemplate,
    cleanup
  };
}