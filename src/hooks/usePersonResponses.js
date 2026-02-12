/**
 * usePersonResponses.js
 *
 * Hook to fetch all form responses for a given person (by their code).
 * Used on the /my-responses page where users enter their code to see
 * all the forms they've filled.
 *
 * Works with both:
 * - Clevo codes (6-digit numbers from the external API)
 * - Direct access codes (6-digit numbers generated at login, or legacy DA_... IDs)
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const usePersonResponses = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState([]);

  /**
   * Fetch all form responses for a given code, after validating the mobile number.
   *
   * How it works:
   * 1. Validate code + mobile number:
   *    - For direct access codes: check the `direct_access` table for matching ID + mobile
   *    - For Clevo codes: call the external API to verify code + mobile combo
   * 2. If validation passes, query `analytic_responses` for all rows where clevo_code matches
   * 3. For each response found, look up the form name from `analytic_forms` using the form_code
   * 4. Calculate completion status and section progress from response_data
   *
   * @param {string} code - The user's clevo code or direct access code
   * @param {string} mobileNumber - The user's 10-digit mobile number (without country code)
   * @returns {Array} - Array of response objects with form info
   */
  const getPersonResponses = useCallback(async (code, mobileNumber) => {
    if (!code || !code.trim()) {
      setResponses([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // ---- Validation Step: verify code + mobile number before fetching responses ----

      // First, check if this code exists in the direct_access table
      const { data: directAccessRecord } = await supabase
        .from('direct_access')
        .select('direct_access_id, mobile_number')
        .eq('direct_access_id', code.trim())
        .maybeSingle();

      if (directAccessRecord) {
        // This is a direct access code — validate mobile number against our database
        if (directAccessRecord.mobile_number !== mobileNumber) {
          setError('Invalid code or mobile number');
          setResponses([]);
          return [];
        }
        // Mobile matches — proceed to fetch responses below
      } else {
        // Not a direct access code — validate via external Clevo API
        try {
          await axios.get(
            `https://api.theorb.bio/api/v1/reports/get_clevo_id?clevo_code=${code.trim()}&mob=${mobileNumber}`
          );
          // API call succeeded — code + mobile is valid, proceed to fetch responses
        } catch {
          // API call failed — invalid code or mobile number
          setError('Invalid code or mobile number');
          setResponses([]);
          return [];
        }
      }

      // ---- Fetch Step: validation passed, now get the actual responses ----

      // Step 1: Get all responses for this code from analytic_responses
      const { data: responseRows, error: fetchError } = await supabase
        .from('analytic_responses')
        .select('form_code, response_data, updated_at, agent_response')
        .eq('clevo_code', code.trim());

      if (fetchError) throw fetchError;

      if (!responseRows || responseRows.length === 0) {
        setResponses([]);
        return [];
      }

      // Step 2: Get the unique form_codes so we can look up form names
      const formCodes = [...new Set(responseRows.map(r => r.form_code))];

      const { data: formRows, error: formError } = await supabase
        .from('analytic_forms')
        .select('form_code, name, sections')
        .in('form_code', formCodes);

      if (formError) throw formError;

      // Build a lookup map: form_code -> { name, sections }
      const formLookup = {};
      if (formRows) {
        for (const form of formRows) {
          formLookup[form.form_code] = {
            name: form.name,
            sections: form.sections || []
          };
        }
      }

      // Step 3: Build the result array by combining response data with form info
      const result = responseRows.map(row => {
        const formInfo = formLookup[row.form_code] || {};
        const responseData = row.response_data || {};
        const totalSections = formInfo.sections ? formInfo.sections.length : 0;

        // Count how many sections have been submitted
        let completedSections = 0;
        if (responseData.sections) {
          completedSections = Object.values(responseData.sections)
            .filter(s => s.is_submitted).length;
        }

        // Detect whether an AI-generated report exists and what type it is
        const rawAgentResponse = row.agent_response;

        const isCompleted = responseData.form_completed === "yes" || !!rawAgentResponse;
        let hasReport = false;
        let reportType = null; // "ayurveda" | "analytics"

        if (rawAgentResponse) {
          hasReport = true;
          // Parse the response to determine report type
          let parsed = rawAgentResponse;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch { parsed = null; }
          }
          // agent_response can be an array (take first element) or an object
          const reportObj = Array.isArray(parsed) ? parsed[0] : parsed;
          // Ayurveda reports have a "constitution" field; everything else is analytics
          if (reportObj && reportObj.constitution) {
            reportType = 'ayurveda';
          } else {
            reportType = 'analytics';
          }
        }

        // Extract coins from rewards inside response_data (defaults to 0 if missing)
        const coins = responseData.rewards?.coins ?? 0;

        // Extract org name from form_code ("orgName/formName" → "orgName")
        // Then make it human-readable: replace underscores with spaces, capitalize each word
        const rawOrgName = row.form_code?.split('/')[0] || '';
        const orgName = rawOrgName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());

        return {
          form_code: row.form_code,
          form_name: formInfo.name || row.form_code,
          org_name: orgName,
          coins,
          form_completed: isCompleted,
          total_sections: totalSections,
          completed_sections: completedSections,
          last_updated: row.updated_at,
          has_report: hasReport,
          report_type: reportType
        };
      });

      // Sort by last_updated descending (most recent first)
      result.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));

      setResponses(result);
      return result;
    } catch (err) {
      console.error('Error fetching person responses:', err);
      setError(err.message);
      setResponses([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getPersonResponses,
    responses,
    isLoading,
    error
  };
};

export default usePersonResponses;
