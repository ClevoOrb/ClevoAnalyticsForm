/**
 * useAnalyticForms.js
 *
 * Hook for managing analytic forms in Supabase.
 * Handles CRUD operations for form configurations (questions, sections).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Theme definitions (same as ThemeSelector) for converting theme ID to colors
const THEMES = {
  default: { dark: "#080594", accent: "#08b7f6" },
  forest: { dark: "#283618", accent: "#52b788" },
  grape: { dark: "#3c096c", accent: "#c77dff" },
  midnight: { dark: "#10002b", accent: "#5a189a" },
  terracotta: { dark: "#fb5607", accent: "#ff006e" },
  sunshine: { dark: "#202020", accent: "#ffee32" },
  silver: { dark: "#131515", accent: "#7de2d1" },
  coffee: { dark: "#006d77", accent: "#83c5be" },
  ruby: { dark: "#0b090a", accent: "#e5383b" },
  violet: { dark: "#041b15", accent: "#136f63" },
  mint: { dark: "#000000", accent: "#CFFFE2" },
  stone: { dark: "#696663", accent: "#cbc5c0" },
  royal: { dark: "#02343f", accent: "#f0edcc" },
  blush: { dark: "#0a174e", accent: "#f5d042" },
  gold: { dark: "#ffc60a", accent: "#ffe285" },
  ocean: { dark: "#3b1877", accent: "#da5a2a" },
  emerald: { dark: "#1c3e35", accent: "#99f2d1" },
  crimson: { dark: "#422057", accent: "#FCF951" },
  neon: { dark: "#03045e", accent: "#b8fb3c" },
  electric: { dark: "#080708", accent: "#3772ff" },
  aqua: { dark: "#4831D4", accent: "#CCF381" },
};

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
   * @param {Object} formData - { name, fileName, questions, sections, themeColor, customColors, logo }
   * @returns {Object} - Created form with form_code
   */
  const createForm = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const formCode = generateFormCode();
      console.log('Creating form with code:', formCode);
      console.log('Form data:', { name: formData.name, sections: formData.sections, themeColor: formData.themeColor, customColors: formData.customColors });

      // Get theme ID (could be "default", "forest", "custom", etc.) or fallback to "default"
      const themeId = formData.themeColor || 'default';

      // Check if logos are too large (warn if > 500KB base64)
      if (formData.logoPC && formData.logoPC.length > 500000) {
        console.warn('Warning: PC Logo is very large:', Math.round(formData.logoPC.length / 1024), 'KB');
      }
      if (formData.logoMobile && formData.logoMobile.length > 500000) {
        console.warn('Warning: Mobile Logo is very large:', Math.round(formData.logoMobile.length / 1024), 'KB');
      }

      const insertData = {
        form_code: formCode,
        name: formData.name,
        file_name: formData.fileName,
        questions: formData.questions,
        sections: formData.sections,
        theme_color: themeId, // Store theme ID (e.g., "default", "forest", "custom")
        custom_colors: formData.customColors || null, // Store custom colors { dark, accent } for custom themes
        theme_method: formData.themeMethod || 'gradient', // Store theme method (gradient/solid)
        logo_pc: formData.logoPC || null, // Custom logo for PC/Desktop
        logo_mobile: formData.logoMobile || null // Custom logo for Mobile
      };

      console.log('Insert data being sent:', {
        ...insertData,
        questions: '[questions array]',
        logo_pc: insertData.logo_pc ? '[base64]' : null,
        logo_mobile: insertData.logo_mobile ? '[base64]' : null
      });

      const { data, error: insertError } = await supabase
        .from('analytic_forms')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', JSON.stringify(insertError, null, 2));
        console.error('Error message:', insertError.message);
        console.error('Error details:', insertError.details);
        console.error('Error hint:', insertError.hint);
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
        .select('id, form_code, name, sections, created_at, theme_color, logo_pc, logo_mobile')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transform to match expected format
      const forms = data.map(form => ({
        id: form.form_code,
        name: form.name,
        sectionsCount: form.sections?.length || 0,
        createdAt: form.created_at,
        themeColor: form.theme_color || '#080594',
        logoPC: form.logo_pc || null,
        logoMobile: form.logo_mobile || null
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

  /**
   * Update the theme color of an existing form
   * @param {string} formCode - The unique form code
   * @param {string} themeColor - The new theme color (hex format)
   * @returns {boolean} - Success status
   */
  const updateFormColor = useCallback(async (formCode, themeColor) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('analytic_forms')
        .update({ theme_color: themeColor })
        .eq('form_code', formCode);

      if (updateError) {
        throw updateError;
      }

      console.log('Form color updated in Supabase:', formCode, themeColor);
      return true;
    } catch (err) {
      console.error('Error updating form color:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update the logo of an existing form
   * @param {string} formCode - The unique form code
   * @param {string|null} logo - The new logo (base64 string or null to remove)
   * @returns {boolean} - Success status
   */
  const updateFormLogo = useCallback(async (formCode, logo) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('analytic_forms')
        .update({ logo: logo })
        .eq('form_code', formCode);

      if (updateError) {
        throw updateError;
      }

      console.log('Form logo updated in Supabase:', formCode, logo ? 'Logo set' : 'Logo removed');
      return true;
    } catch (err) {
      console.error('Error updating form logo:', err);
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
    updateFormColor,
    updateFormLogo,
    isLoading,
    error
  };
};

export default useAnalyticForms;
