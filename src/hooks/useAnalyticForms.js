/**
 * useAnalyticForms.js
 *
 * Hook for managing analytic forms in Supabase.
 * Handles CRUD operations for form configurations (questions, sections).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generate a unique form code (6 characters alphanumeric)
 */
const generateFormCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const useAnalyticForms = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new form in Supabase
   * @param {Object} formData - { name, fileName, questions, sections }
   * @returns {Object} - Created form with form_code
   */
  const createForm = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const formCode = generateFormCode();
      console.log('Creating form with code:', formCode);
      console.log('Form data:', { name: formData.name, sections: formData.sections });

      const { data, error: insertError } = await supabase
        .from('analytic_forms')
        .insert({
          form_code: formCode,
          name: formData.name,
          file_name: formData.fileName,
          questions: formData.questions,
          sections: formData.sections
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw insertError;
      }

      console.log('Form created in Supabase:', data);
      console.log('Form code to use in URL:', data.form_code);
      return data;
    } catch (err) {
      console.error('Error creating form:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get a form by its form_code
   * @param {string} formCode - The unique form code
   * @returns {Object|null} - Form data or null if not found
   */
  const getForm = useCallback(async (formCode) => {
    setIsLoading(true);
    setError(null);

    console.log('Fetching form with code:', formCode);

    try {
      const { data, error: fetchError } = await supabase
        .from('analytic_forms')
        .select('*')
        .eq('form_code', formCode)
        .single();

      console.log('Supabase response - data:', data, 'error:', fetchError);

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows returned
          console.log('No form found with code:', formCode);
          return null;
        }
        throw fetchError;
      }

      console.log('Form fetched from Supabase:', data);
      return data;
    } catch (err) {
      console.error('Error fetching form:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get all forms (for forms list page)
   * @returns {Array} - List of all forms
   */
  const getAllForms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('analytic_forms')
        .select('id, form_code, name, sections, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform to match expected format
      const forms = data.map(form => ({
        id: form.form_code, // Use form_code as id for URL compatibility
        name: form.name,
        sectionsCount: form.sections?.length || 0,
        createdAt: form.created_at
      }));

      console.log('All forms fetched from Supabase:', forms);
      return forms;
    } catch (err) {
      console.error('Error fetching all forms:', err);
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete a form by its form_code
   * @param {string} formCode - The unique form code
   * @returns {boolean} - Success status
   */
  const deleteForm = useCallback(async (formCode) => {
    setIsLoading(true);
    setError(null);

    try {
      // First delete all responses for this form
      await supabase
        .from('analytic_responses')
        .delete()
        .eq('form_code', formCode);

      // Then delete the form itself
      const { error: deleteError } = await supabase
        .from('analytic_forms')
        .delete()
        .eq('form_code', formCode);

      if (deleteError) {
        throw deleteError;
      }

      console.log('Form deleted from Supabase:', formCode);
      return true;
    } catch (err) {
      console.error('Error deleting form:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createForm,
    getForm,
    getAllForms,
    deleteForm,
    isLoading,
    error
  };
};

export default useAnalyticForms;
