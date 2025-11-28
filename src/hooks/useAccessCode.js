/**
 * useAccessCode Hook
 *
 * This hook handles access code verification against the Supabase database.
 * It checks if a given code exists in the 'access_code' table and manages
 * the authenticated state using localStorage.
 *
 * Why localStorage?
 * - We store the verified status in localStorage so users don't have to
 *   enter the code every time they refresh or revisit the page
 * - The key 'admin_access_verified' stores 'true' when access is granted
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Key used in localStorage to remember if user has been verified
const ACCESS_VERIFIED_KEY = 'admin_access_verified';

export default function useAccessCode() {
  // State to track if user has valid access
  const [isVerified, setIsVerified] = useState(false);
  // State to track if we're currently checking the code
  const [isLoading, setIsLoading] = useState(false);
  // State to track any errors during verification
  const [error, setError] = useState(null);

  // On mount, check if user was previously verified (stored in localStorage)
  useEffect(() => {
    const storedVerification = localStorage.getItem(ACCESS_VERIFIED_KEY);
    if (storedVerification === 'true') {
      setIsVerified(true);
    }
  }, []);

  /**
   * Verify an access code against the database
   * @param {string} code - The 6-digit access code to verify
   * @returns {Promise<boolean>} - True if code is valid, false otherwise
   */
  const verifyCode = async (code) => {
    setIsLoading(true);
    setError(null);

    try {
      // Query Supabase to check if this code exists in access_code table
      const { data, error: supabaseError } = await supabase
        .from('access_code')
        .select('code')
        .eq('code', code)
        .single();

      if (supabaseError) {
        // If no row found, supabase returns an error
        if (supabaseError.code === 'PGRST116') {
          // PGRST116 means "no rows returned" - invalid code
          setError('Invalid access code');
          setIsVerified(false);
          return false;
        }
        // Some other error occurred
        throw supabaseError;
      }

      if (data) {
        // Code is valid! Save to localStorage and update state
        localStorage.setItem(ACCESS_VERIFIED_KEY, 'true');
        setIsVerified(true);
        return true;
      }

      setError('Invalid access code');
      setIsVerified(false);
      return false;
    } catch (err) {
      console.error('Error verifying access code:', err);
      setError('Error verifying code. Please try again.');
      setIsVerified(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear the verification status (logout)
   * This removes the stored verification from localStorage
   */
  const clearVerification = () => {
    localStorage.removeItem(ACCESS_VERIFIED_KEY);
    setIsVerified(false);
  };

  return {
    isVerified,    // Boolean: is user currently verified?
    isLoading,     // Boolean: is verification in progress?
    error,         // String or null: any error message
    verifyCode,    // Function: call with code to verify
    clearVerification, // Function: call to logout/clear access
  };
}
