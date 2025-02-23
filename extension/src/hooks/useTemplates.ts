import { useState, useCallback, useEffect } from "react";
import type { Template } from "../types/sidebar";
import type { Toast } from "../components/common/Toast"; // For toast type
import { makeApiRequest } from "../utils/api";

interface UseTemplatesOptions {
  onError?: (error: Error) => void;
  maxRetries?: number;
  debounceDelay?: number;
}

interface UseTemplatesProps {
  toast: ReturnType<typeof useToast>; // Toast instance from useToast
  options?: UseTemplatesOptions;
}

interface OperationState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export function useTemplates({ toast, options = {} }: UseTemplatesProps) {
  const { maxRetries = 3, debounceDelay = 300 } = options;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pinnedTemplates, setPinnedTemplates] = useState<Template[]>([]);
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
      setOperationState("fetch", { isLoading: true, error: null });
      
      const response = await makeApiRequest<Template[]>({
        url: "/templates",
        method: "GET"
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error("No data received from server");
      }

      const allTemplates = response.data;
      setTemplates(allTemplates.filter((t) => !t.isPinned));
      setPinnedTemplates(allTemplates.filter((t) => t.isPinned));
      setOperationState("fetch", { isLoading: false, error: null });
      return allTemplates;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load templates");
      setOperationState("fetch", { isLoading: false, error });
      options.onError?.(error);
      toast.error("Failed to load templates");
      throw error;
    }
  }, [setOperationState, options, toast]);

  const createTemplate = useCallback(
    async (data: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
      try {
        setOperationState("create", { isLoading: true, error: null });
        
        const response = await makeApiRequest<Template>({
          url: "/templates",
          method: "POST",
          body: data
        });

        if (response.error) {
          throw new Error(response.error);
        }

        if (!response.data) {
          throw new Error("No data received from server");
        }

        const newTemplate = response.data;

        if (newTemplate.isPinned) {
          setPinnedTemplates((prev) => [...prev, newTemplate]);
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
    },
    [setOperationState, options, toast]
  );

  const updateTemplate = useCallback(
    async (data: Partial<Template> & { id: string }) => {
      try {
        setOperationState("update", { isLoading: true, error: null });
        
        const response = await makeApiRequest<Template>({
          url: `/templates/${data.id}`,
          method: "PUT",
          body: data
        });

        if (response.error) {
          throw new Error(response.error);
        }

        if (!response.data) {
          throw new Error("No data received from server");
        }

        const updatedTemplate = response.data;

        const updateTemplateList = (list: Template[]) =>
          list.map((t) => (t.id === data.id ? updatedTemplate : t));

        if (updatedTemplate.isPinned) {
          setPinnedTemplates((prev) => updateTemplateList(prev));
          setTemplates((prev) => prev.filter((t) => t.id !== data.id));
        } else {
          setTemplates((prev) => updateTemplateList(prev));
          setPinnedTemplates((prev) => prev.filter((t) => t.id !== data.id));
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
    },
    [setOperationState, options, toast]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
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
        setPinnedTemplates((prev) => prev.filter((t) => t.id !== id));
        setOperationState("delete", { isLoading: false, error: null });
        toast.success("Template deleted successfully");
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete template");
        setOperationState("delete", { isLoading: false, error });
        options.onError?.(error);
        toast.error("Failed to delete template");
        throw error;
      }
    },
    [setOperationState, options, toast]
  );

  const pinTemplate = useCallback(
    async (id: string) => {
      const template = [...templates, ...pinnedTemplates].find((t) => t.id === id);
      if (!template) throw new Error("Template not found");
      await updateTemplate({ id, isPinned: true });
    },
    [templates, pinnedTemplates, updateTemplate]
  );

  const unpinTemplate = useCallback(
    async (id: string) => {
      const template = [...templates, ...pinnedTemplates].find((t) => t.id === id);
      if (!template) throw new Error("Template not found");
      await updateTemplate({ id, isPinned: false });
    },
    [templates, pinnedTemplates, updateTemplate]
  );

  return {
    templates,
    pinnedTemplates,
    operationStates,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    pinTemplate,
    unpinTemplate,
    cleanup
  };
}