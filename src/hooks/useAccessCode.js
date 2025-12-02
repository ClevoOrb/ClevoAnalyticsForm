/**
 * useAccessCode Hook
 *
 * This hook handles access code verification against the Supabase database.
 * It checks if a given code exists in the 'access_code' table and manages
 * the authenticated state using localStorage.
 *
 * Security Approach:
 * - We store the ACCESS CODE in localStorage (not the role!)
 * - The role is fetched from the database each time and kept only in memory
 * - This prevents exposing role information in localStorage
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

// Keys used in localStorage (NOTE: we do NOT store role here for security)
const ACCESS_CODE_KEY = 'admin_access_code';  // Stores the actual code used (encrypted)
const ACCESS_TIMESTAMP_KEY = 'admin_access_timestamp';

// OLD deprecated keys - will be removed on load for security
const DEPRECATED_KEYS = ['admin_access_role', 'admin_access_verified'];

// Session expiry time: 2 days in milliseconds
const SESSION_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

// Simple encryption key for obfuscation (not meant for high security, just hides plain text)
const ENCRYPTION_KEY = 'clevo_secure_2024';

/**
 * Simple encrypt function to obfuscate the access code
 * Uses XOR cipher + Base64 encoding
 */
const encryptCode = (code) => {
  try {
    let encrypted = '';
    for (let i = 0; i < code.length; i++) {
      // XOR each character with the key
      const charCode = code.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      encrypted += String.fromCharCode(charCode);
    }
    // Base64 encode the result
    return btoa(encrypted);
  } catch (err) {
    console.error('Encryption error:', err);
    return null;
  }
};

/**
 * Simple decrypt function to retrieve the access code
 */
const decryptCode = (encryptedCode) => {
  try {
    // Base64 decode first
    const decoded = atob(encryptedCode);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      // XOR each character with the key (same operation reverses it)
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      decrypted += String.fromCharCode(charCode);
    }
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};

export default function useAccessCode() {
  // State to track if user has valid access
  const [isVerified, setIsVerified] = useState(false);
  // State to track the user's role (kept in memory only, NOT in localStorage)
  const [role, setRole] = useState(null);
  // State to track if we're currently checking the code
  const [isLoading, setIsLoading] = useState(true); // Start as true to check on mount
  // State to track any errors during verification
  const [error, setError] = useState(null);

  /**
   * Fetch role from database for a given code
   * This is called on mount to verify stored code and get its role
   */
  const fetchRoleFromDatabase = async (code) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('access_code')
        .select('code, role')
        .eq('code', code)
        .single();

      if (supabaseError || !data) {
        return null;
      }

      return data.role || 'viewer';
    } catch (err) {
      console.error('Error fetching role:', err);
      return null;
    }
  };

  // On mount, check if user was previously verified
  // Fetch the role from database (not from localStorage)
  useEffect(() => {
    const checkStoredAccess = async () => {
      // CLEANUP: Remove old deprecated keys that exposed the role
      DEPRECATED_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });

      const encryptedCode = localStorage.getItem(ACCESS_CODE_KEY);
      const storedTimestamp = localStorage.getItem(ACCESS_TIMESTAMP_KEY);

      if (!encryptedCode) {
        setIsLoading(false);
        return;
      }

      // Decrypt the stored code
      const storedCode = decryptCode(encryptedCode);
      if (!storedCode) {
        // Decryption failed - clear invalid data
        localStorage.removeItem(ACCESS_CODE_KEY);
        localStorage.removeItem(ACCESS_TIMESTAMP_KEY);
        setIsLoading(false);
        return;
      }

      // Check if session has expired
      if (storedTimestamp) {
        const loginTime = parseInt(storedTimestamp, 10);
        const currentTime = Date.now();
        const timePassed = currentTime - loginTime;

        if (timePassed > SESSION_EXPIRY_MS) {
          // Session expired! Clear everything and require re-login
          console.log('Session expired after 2 days. Please login again.');
          localStorage.removeItem(ACCESS_CODE_KEY);
          localStorage.removeItem(ACCESS_TIMESTAMP_KEY);
          setIsVerified(false);
          setRole(null);
          setIsLoading(false);
          return;
        }
      }

      // Session not expired - verify code and fetch role from database
      const fetchedRole = await fetchRoleFromDatabase(storedCode);

      if (fetchedRole) {
        // Code is still valid in database
        setIsVerified(true);
        setRole(fetchedRole);
      } else {
        // Code no longer valid in database - clear localStorage
        localStorage.removeItem(ACCESS_CODE_KEY);
        localStorage.removeItem(ACCESS_TIMESTAMP_KEY);
        setIsVerified(false);
        setRole(null);
      }

      setIsLoading(false);
    };

    checkStoredAccess();
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
        .select('code, role')
        .eq('code', code)
        .single();

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          // PGRST116 means "no rows returned" - invalid code
          setError('Invalid access code');
          setIsVerified(false);
          setRole(null);
          return false;
        }
        throw supabaseError;
      }

      if (data) {
        // Code is valid!
        // Encrypt the code before storing in localStorage
        const encryptedCode = encryptCode(code);
        if (encryptedCode) {
          localStorage.setItem(ACCESS_CODE_KEY, encryptedCode);
          localStorage.setItem(ACCESS_TIMESTAMP_KEY, Date.now().toString());
        }

        // Role is kept in memory only
        const userRole = data.role || 'viewer';
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
   */
  const clearVerification = () => {
    localStorage.removeItem(ACCESS_CODE_KEY);
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
    isVerified,
    isLoading,
    error,
    role,
    verifyCode,
    clearVerification,
    isAdmin,
  };
}
