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
 * - The key 'admin_access_role' stores the user's role (e.g., 'admin', 'viewer')
 * - The key 'admin_access_timestamp' stores when the user logged in
 *
 * Session Expiry:
 * - Sessions automatically expire after 2 days (48 hours)
 * - After expiry, user must re-enter access code
 *
 * Role-based permissions:
 * - 'admin': Can view, create, and DELETE forms
 * - Other roles: Can only view and create forms (no delete)
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Keys used in localStorage to remember verification and role
const ACCESS_VERIFIED_KEY = 'admin_access_verified';
const ACCESS_ROLE_KEY = 'admin_access_role';
const ACCESS_TIMESTAMP_KEY = 'admin_access_timestamp';

// Session expiry time: 1 minute in milliseconds (for testing)
// 1 minute = 60 seconds * 1000 milliseconds
const SESSION_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

export default function useAccessCode() {
  // State to track if user has valid access
  const [isVerified, setIsVerified] = useState(false);
  // State to track the user's role (e.g., 'admin', 'viewer')
  const [role, setRole] = useState(null);
  // State to track if we're currently checking the code
  const [isLoading, setIsLoading] = useState(false);
  // State to track any errors during verification
  const [error, setError] = useState(null);

  // On mount, check if user was previously verified (stored in localStorage)
  // Also check if the session has expired (older than 2 days)
  useEffect(() => {
    const storedVerification = localStorage.getItem(ACCESS_VERIFIED_KEY);
    const storedRole = localStorage.getItem(ACCESS_ROLE_KEY);
    const storedTimestamp = localStorage.getItem(ACCESS_TIMESTAMP_KEY);

    if (storedVerification === 'true') {
      // Check if session has expired
      if (storedTimestamp) {
        const loginTime = parseInt(storedTimestamp, 10);
        const currentTime = Date.now();
        const timePassed = currentTime - loginTime;

        if (timePassed > SESSION_EXPIRY_MS) {
          // Session expired! Clear everything and require re-login
          console.log('Session expired after 2 days. Please login again.');
          localStorage.removeItem(ACCESS_VERIFIED_KEY);
          localStorage.removeItem(ACCESS_ROLE_KEY);
          localStorage.removeItem(ACCESS_TIMESTAMP_KEY);
          setIsVerified(false);
          setRole(null);
          return;
        }
      }

      // Session still valid
      setIsVerified(true);
      setRole(storedRole);
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
      // Also fetch the 'role' column to determine user permissions
      const { data, error: supabaseError } = await supabase
        .from('access_code')
        .select('code, role')
        .eq('code', code)
        .single();

      if (supabaseError) {
        // If no row found, supabase returns an error
        if (supabaseError.code === 'PGRST116') {
          // PGRST116 means "no rows returned" - invalid code
          setError('Invalid access code');
          setIsVerified(false);
          setRole(null);
          return false;
        }
        // Some other error occurred
        throw supabaseError;
      }

      if (data) {
        // Code is valid! Save to localStorage and update state
        localStorage.setItem(ACCESS_VERIFIED_KEY, 'true');
        // Store the role (default to 'viewer' if not set in database)
        const userRole = data.role || 'viewer';
        localStorage.setItem(ACCESS_ROLE_KEY, userRole);
        // Store the current timestamp for session expiry (2 days)
        localStorage.setItem(ACCESS_TIMESTAMP_KEY, Date.now().toString());
        setIsVerified(true);
        setRole(userRole);
        return true;
      }

      setError('Invalid access code');
      setIsVerified(false);
      setRole(null);
      return false;
    } catch (err) {
      console.error('Error verifying access code:', err);
      setError('Error verifying code. Please try again.');
      setIsVerified(false);
      setRole(null);
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
    localStorage.removeItem(ACCESS_ROLE_KEY);
    localStorage.removeItem(ACCESS_TIMESTAMP_KEY);
    setIsVerified(false);
    setRole(null);
  };

  /**
   * Check if the current user has admin role
   * Only admins can delete forms
   * @returns {boolean} - True if user is admin
   */
  const isAdmin = () => {
    return role === 'admin';
  };

  return {
    isVerified,    // Boolean: is user currently verified?
    isLoading,     // Boolean: is verification in progress?
    error,         // String or null: any error message
    role,          // String or null: user's role ('admin', 'viewer', etc.)
    verifyCode,    // Function: call with code to verify
    clearVerification, // Function: call to logout/clear access
    isAdmin,       // Function: returns true if user is admin
  };
}
