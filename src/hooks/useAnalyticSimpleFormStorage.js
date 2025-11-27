/**
 * useAnalyticSimpleFormStorage.js
 *
 * Custom hook for managing form data storage for Analytics Forms.
 * Uses localStorage for immediate caching (fast) + Supabase for persistence (cloud backup).
 */

import { useState, useCallback } from 'react';
import useAnalyticResponses from './useAnalyticResponses';

const useAnalyticSimpleFormStorage = (sectionName, clevoCode, formId) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const { saveSectionData, getSectionData } = useAnalyticResponses(formId, clevoCode);

  const getLocalStorageKey = useCallback(() => {
    if (!sectionName || !clevoCode || !formId) return null;
    return `analytic_form_data_${formId}_${clevoCode}_${sectionName}`;
  }, [sectionName, clevoCode, formId]);

  /**
   * Save form data to localStorage (immediate) and Supabase (background)
   */
  const saveData = useCallback(async (formData, mainQuestions, subQuestions) => {
    if (!sectionName || !clevoCode || !formId) return false;

    try {
      setIsLoading(true);

      const dataToSave = {
        formData: formData || {},
        mainQuestions: mainQuestions || {},
        subQuestions: subQuestions || [],
        lastSaved: new Date().toISOString(),
        timestamp: Date.now(),
        ttl: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days expiration
      };

      const storageKey = getLocalStorageKey();
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      }

      setLastSaved(dataToSave.lastSaved);

      saveSectionData(sectionName, {
        formData: dataToSave.formData,
        mainQuestions: dataToSave.mainQuestions,
        subQuestions: dataToSave.subQuestions
      }, false).catch(() => {});

      return true;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sectionName, clevoCode, formId, getLocalStorageKey, saveSectionData]);

  /**
   * Load form data - localStorage first (fast), then Supabase fallback
   */
  const loadData = useCallback(async () => {
    if (!sectionName || !clevoCode || !formId) return null;

    try {
      setIsLoading(true);

      const storageKey = getLocalStorageKey();
      if (storageKey) {
        const localData = localStorage.getItem(storageKey);
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);

            if (parsedData.ttl && Date.now() < parsedData.ttl) {
              setLastSaved(parsedData.lastSaved);
              return {
                formData: parsedData.formData,
                mainQuestions: parsedData.mainQuestions,
                subQuestions: parsedData.subQuestions,
                lastSaved: parsedData.lastSaved
              };
            } else {
              localStorage.removeItem(storageKey);
            }
          } catch (parseError) {
            localStorage.removeItem(storageKey);
          }
        }
      }

      const supabaseData = await getSectionData(sectionName);

      if (supabaseData) {
        setLastSaved(supabaseData.lastSaved);

        if (storageKey) {
          const cacheData = {
            formData: supabaseData.formData,
            mainQuestions: supabaseData.mainQuestions,
            subQuestions: supabaseData.subQuestions,
            lastSaved: supabaseData.lastSaved,
            timestamp: Date.now(),
            ttl: Date.now() + (7 * 24 * 60 * 60 * 1000)
          };
          localStorage.setItem(storageKey, JSON.stringify(cacheData));
        }

        return {
          formData: supabaseData.formData,
          mainQuestions: supabaseData.mainQuestions,
          subQuestions: supabaseData.subQuestions,
          lastSaved: supabaseData.lastSaved
        };
      }

      return null;
    } catch (error) {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sectionName, clevoCode, formId, getLocalStorageKey, getSectionData]);

  /**
   * Clear localStorage cache for this section
   */
  const clearData = useCallback(() => {
    if (!sectionName || !clevoCode || !formId) return false;

    try {
      const storageKey = getLocalStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }

      setLastSaved(null);
      return true;
    } catch (error) {
      return false;
    }
  }, [sectionName, clevoCode, formId, getLocalStorageKey]);

  /**
   * Force sync localStorage data to Supabase
   */
  const syncToSupabase = useCallback(async () => {
    if (!sectionName || !clevoCode || !formId) return false;

    try {
      const storageKey = getLocalStorageKey();
      if (!storageKey) return false;

      const localData = localStorage.getItem(storageKey);
      if (!localData) return false;

      const parsedData = JSON.parse(localData);

      const success = await saveSectionData(sectionName, {
        formData: parsedData.formData,
        mainQuestions: parsedData.mainQuestions,
        subQuestions: parsedData.subQuestions
      }, false);

      return success;
    } catch (error) {
      return false;
    }
  }, [sectionName, clevoCode, formId, getLocalStorageKey, saveSectionData]);

  return {
    saveData,
    loadData,
    clearData,
    syncToSupabase,
    lastSaved,
    isLoading
  };
};

export default useAnalyticSimpleFormStorage;
