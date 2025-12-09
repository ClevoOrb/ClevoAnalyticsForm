/**
 * useAnalyticResponses.js
 *
 * Hook for managing user responses in Supabase.
 * Handles saving/loading form answers, progress tracking, and rewards.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const useAnalyticResponses = (formCode, clevoCode) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);

  // Use a ref to store responseData for callbacks to avoid infinite loops
  const responseDataRef = useRef(null);

  /**
   * Get user's response data for this form
   */
  const getResponse = useCallback(async (forceRefresh = false) => {
    if (!formCode || !clevoCode) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('analytic_responses')
        .select('*')
        .eq('form_code', formCode)
        .eq('clevo_code', clevoCode)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return null;
        }
        throw fetchError;
      }

      setResponseData(data.response_data);
      responseDataRef.current = data.response_data;
      return data.response_data;
    } catch (err) {
      console.error('Error fetching response:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formCode, clevoCode]);

  /**
   * Save or update user's response data
   */
  const saveResponse = useCallback(async (newResponseData) => {
    if (!formCode || !clevoCode) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: upsertError } = await supabase
        .from('analytic_responses')
        .upsert({
          form_code: formCode,
          clevo_code: clevoCode,
          response_data: newResponseData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'form_code,clevo_code'
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setResponseData(newResponseData);
      responseDataRef.current = newResponseData;
      return true;
    } catch (err) {
      console.error('saveResponse error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [formCode, clevoCode]);

  /**
   * Save section data (answers for a specific section)
   * IMPORTANT: Only saves to Supabase when isSubmitted = true
   * This prevents unsubmitted sections with empty answers from appearing in the response
   */
  const saveSectionData = useCallback(async (sectionName, sectionData, isSubmitted = false) => {
    if (!formCode || !clevoCode) return false;

    // Only save to Supabase when the section is being submitted
    // Auto-save (isSubmitted = false) is handled by localStorage only
    if (!isSubmitted) {
      return true; // Return success without saving to Supabase
    }

    try {
      const currentData = await getResponse(true);

      const updatedData = currentData ? { ...currentData } : {
        sections: {},
        rewards: { coins: 0, streaks: 0, rules_seen: false },
        last_filled_section: null,
        form_completed: "no"
      };

      if (!updatedData.sections) {
        updatedData.sections = {};
      }

      updatedData.sections[sectionName] = {
        answers: sectionData.formData || sectionData.answers || {},
        main_questions: sectionData.mainQuestions || {},
        sub_questions: sectionData.subQuestions || [],
        is_submitted: isSubmitted,
        last_saved: new Date().toISOString()
      };

      if (isSubmitted) {
        updatedData.last_filled_section = sectionName;
      }

      return await saveResponse(updatedData);
    } catch (err) {
      console.error('saveSectionData error:', err);
      setError(err.message);
      return false;
    }
  }, [formCode, clevoCode, getResponse, saveResponse]);

  /**
   * Get section data for a specific section
   */
  const getSectionData = useCallback(async (sectionName) => {
    if (!formCode || !clevoCode) return null;

    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      if (!currentData || !currentData.sections || !currentData.sections[sectionName]) {
        return null;
      }

      const section = currentData.sections[sectionName];

      return {
        formData: section.answers,
        mainQuestions: section.main_questions,
        subQuestions: section.sub_questions,
        lastSaved: section.last_saved,
        isSubmitted: section.is_submitted
      };
    } catch (err) {
      console.error('Error getting section data:', err);
      return null;
    }
  }, [formCode, clevoCode, getResponse]);

  /**
   * Mark a section as submitted
   */
  const markSectionSubmitted = useCallback(async (sectionName) => {
    if (!formCode || !clevoCode) return false;

    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      if (!currentData) {
        currentData = {
          sections: {},
          rewards: { coins: 0, streaks: 0, rules_seen: false },
          last_filled_section: null,
          form_completed: "no"
        };
      }

      if (!currentData.sections[sectionName]) {
        currentData.sections[sectionName] = {
          answers: {},
          main_questions: {},
          sub_questions: [],
          is_submitted: false,
          last_saved: new Date().toISOString()
        };
      }

      currentData.sections[sectionName].is_submitted = true;
      currentData.sections[sectionName].last_saved = new Date().toISOString();
      currentData.last_filled_section = sectionName;

      return await saveResponse(currentData);
    } catch (err) {
      console.error('Error marking section submitted:', err);
      return false;
    }
  }, [formCode, clevoCode, getResponse, saveResponse]);

  /**
   * Get rewards data
   */
  const getRewards = useCallback(async () => {
    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      return currentData?.rewards || { coins: 0, streaks: 0, rules_seen: false };
    } catch (err) {
      return { coins: 0, streaks: 0, rules_seen: false };
    }
  }, [getResponse]);

  /**
   * Update rewards data
   */
  const updateRewards = useCallback(async (rewardsUpdate) => {
    if (!formCode || !clevoCode) return false;

    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      if (!currentData) {
        currentData = {
          sections: {},
          rewards: { coins: 0, streaks: 0, rules_seen: false },
          last_filled_section: null,
          form_completed: "no"
        };
      }

      currentData.rewards = {
        ...currentData.rewards,
        ...rewardsUpdate,
        last_updated: Date.now()
      };

      return await saveResponse(currentData);
    } catch (err) {
      console.error('Error updating rewards:', err);
      return false;
    }
  }, [formCode, clevoCode, getResponse, saveResponse]);

  /**
   * Mark the entire form as submitted (final submission)
   */
  const markFormSubmitted = useCallback(async () => {
    if (!formCode || !clevoCode) return false;

    try {
      const freshData = await getResponse();

      let currentData = freshData || {
        sections: {},
        rewards: { coins: 0, streaks: 0, rules_seen: false },
        last_filled_section: null,
        form_completed: "no"
      };

      const updatedData = {
        ...currentData,
        form_completed: "yes"
      };

      return await saveResponse(updatedData);
    } catch (err) {
      console.error('Error marking form as submitted:', err);
      return false;
    }
  }, [formCode, clevoCode, getResponse, saveResponse]);

  /**
   * Check if the form has been finally submitted
   */
  const isFormSubmitted = useCallback(async () => {
    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      return currentData?.form_completed === "yes";
    } catch (err) {
      return false;
    }
  }, [getResponse]);

  /**
   * Get overall progress for all sections
   */
  const getOverallProgress = useCallback(async (allSections) => {
    try {
      let currentData = responseDataRef.current;
      if (!currentData) {
        currentData = await getResponse();
      }

      if (!currentData || !currentData.sections) {
        return { completedCount: 0, totalCount: allSections.length, percentage: 0 };
      }

      const completedCount = allSections.filter(
        section => currentData.sections[section]?.is_submitted
      ).length;

      return {
        completedCount,
        totalCount: allSections.length,
        percentage: Math.round((completedCount / allSections.length) * 100)
      };
    } catch (err) {
      return { completedCount: 0, totalCount: allSections.length, percentage: 0 };
    }
  }, [getResponse]);

  return {
    getResponse,
    saveResponse,
    saveSectionData,
    getSectionData,
    markSectionSubmitted,
    markFormSubmitted,
    isFormSubmitted,
    getRewards,
    updateRewards,
    getOverallProgress,
    responseData,
    isLoading,
    error
  };
};

export default useAnalyticResponses;
