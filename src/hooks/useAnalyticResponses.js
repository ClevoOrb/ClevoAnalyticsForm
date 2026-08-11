/**
 * useAnalyticResponses.js
 *
 * Hook for managing user responses in Supabase.
 * Handles saving/loading form answers, progress tracking, and rewards.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const useAnalyticResponses = (formCode, rawClevoCode) => {
  // Codes may come from cookies/inputs with stray whitespace (e.g. a trailing
  // newline), which creates duplicate rows in Supabase — always use trimmed values
  const clevoCode = typeof rawClevoCode === 'string' ? rawClevoCode.trim() : rawClevoCode;
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
      // Not .single(): if duplicate rows exist for this user, .single() errors
      // and every caller sees "no data" — take the most recently updated row instead
      const { data, error: fetchError } = await supabase
        .from('analytic_responses')
        .select('*')
        .eq('form_code', formCode)
        .eq('clevo_code', clevoCode)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      if (!data || data.length === 0) {
        return null;
      }

      setResponseData(data[0].response_data);
      responseDataRef.current = data[0].response_data;
      return data[0].response_data;
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
      const payload = {
        form_code: formCode,
        clevo_code: clevoCode,
        response_data: newResponseData,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('analytic_responses')
        .upsert(payload, {
          onConflict: 'form_code,clevo_code'
        });

      if (upsertError) {
        // 42P10: the table has no unique constraint on (form_code, clevo_code),
        // so ON CONFLICT is rejected and NOTHING is ever saved. Fall back to a
        // manual update-then-insert so saving works regardless of the schema.
        if (upsertError.code === '42P10') {
          const { data: updatedRows, error: updateError } = await supabase
            .from('analytic_responses')
            .update({ response_data: newResponseData, updated_at: payload.updated_at })
            .eq('form_code', formCode)
            .eq('clevo_code', clevoCode)
            .select('form_code');

          if (updateError) {
            throw updateError;
          }

          if (!updatedRows || updatedRows.length === 0) {
            const { error: insertError } = await supabase
              .from('analytic_responses')
              .insert(payload);

            if (insertError) {
              throw insertError;
            }
          }
        } else {
          throw upsertError;
        }
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
   * Get agent response data (LLM analysis results) for this form submission
   */
  const getAgentResponse = useCallback(async () => {
    if (!formCode || !clevoCode) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data: rows, error: fetchError } = await supabase
        .from('analytic_responses')
        .select('agent_response')
        .eq('form_code', formCode)
        .eq('clevo_code', clevoCode)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      if (!rows || rows.length === 0) {
        return null; // No record found
      }

      // Parse the agent_response if it's a string
      const agentResponse = rows[0]?.agent_response;
      if (typeof agentResponse === 'string') {
        try {
          return JSON.parse(agentResponse);
        } catch {
          return agentResponse;
        }
      }
      return agentResponse;
    } catch (err) {
      console.error('Error fetching agent response:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formCode, clevoCode]);

  /**
   * Get agent response with status information.
   * Unlike getAgentResponse() which returns null for both "pending" and "not found",
   * this function distinguishes between the two by also checking response_data.form_completed.
   *
   * Returns: { status: 'ready' | 'pending' | 'not_found' | 'error', data: parsedReport | null, error?: string }
   */
  const getAgentResponseWithStatus = useCallback(async () => {
    if (!formCode || !clevoCode) return { status: 'error', data: null, error: 'Missing form or user code' };

    try {
      const { data: rows, error: fetchError } = await supabase
        .from('analytic_responses')
        .select('agent_response, response_data')
        .eq('form_code', formCode)
        .eq('clevo_code', clevoCode)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        return { status: 'error', data: null, error: fetchError.message };
      }

      if (!rows || rows.length === 0) {
        // No row exists at all — user never submitted this form
        return { status: 'not_found', data: null };
      }

      const data = rows[0];

      // Row exists — check if agent_response has data
      const agentResponse = data?.agent_response;
      if (agentResponse) {
        // Report is ready — parse if needed
        let parsed = agentResponse;
        if (typeof agentResponse === 'string') {
          try { parsed = JSON.parse(agentResponse); } catch { parsed = agentResponse; }
        }
        return { status: 'ready', data: parsed };
      }

      // agent_response is null — check if form was completed (report is being generated)
      const formCompleted = data?.response_data?.form_completed;
      if (formCompleted === 'yes') {
        return { status: 'pending', data: null };
      }

      // Row exists but form not completed and no agent_response — treat as not found
      return { status: 'not_found', data: null };
    } catch (err) {
      console.error('Error fetching agent response with status:', err);
      return { status: 'error', data: null, error: err.message };
    }
  }, [formCode, clevoCode]);

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
    getAgentResponse,
    getAgentResponseWithStatus,
    responseData,
    isLoading,
    error
  };
};

export default useAnalyticResponses;
