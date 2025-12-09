/**
 * AccessCodeGuard Component
 *
 * This is a "Protected Route" wrapper component. It wraps around pages that
 * require access code verification before they can be viewed.
 *
 * How it works:
 * 1. When user tries to access a protected page (like /analytic-forms)
 * 2. This component checks if they're already verified (via localStorage)
 * 3. If NOT verified: Shows an access code entry form
 * 4. If verified: Shows the actual page content (children)
 *
 * Usage in routes:
 * <AccessCodeGuard>
 *   <YourProtectedComponent />
 * </AccessCodeGuard>
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import useAccessCode from '../../hooks/useAccessCode';
import LoadingScreen from '../pages/Form/LoadingScreen';

export default function AccessCodeGuard({ children }) {
  // Get verification state and functions from our custom hook
  const { isVerified, isLoading, error, verifyCode } = useAccessCode();

  // Local state for the input field
  const [code, setCode] = useState('');

  /**
   * Handle form submission
   * Calls verifyCode from our hook to check if code is valid
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error('Please enter a 6-digit access code');
      return;
    }

    const isValid = await verifyCode(code);

    if (isValid) {
      toast.success('Access granted!');
    } else {
      toast.error('Invalid access code. Please try again.');
    }
  };

  // Show loading screen while checking verification
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If user is verified, show the protected content
  if (isVerified) {
    return children;
  }

  // Default palette colors - admin page always uses these
  const defaultDark = "#080594";

  // If not verified, show the access code entry form
  // This UI is styled to match the existing AnalyticFormLogin page
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: defaultDark }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Enter your 6-digit access code
          </p>
        </div>

        {/* Access Code Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="accessCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Access Code
            </label>
            <input
              type="text"
              id="accessCode"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                // Only allow numeric input
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              onKeyDown={(e) => {
                // Prevent non-numeric keys (except control keys)
                const isControlCommand =
                  (e.ctrlKey || e.metaKey) &&
                  ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase());

                if (
                  !/[0-9]/.test(e.key) &&
                  e.key !== 'Backspace' &&
                  e.key !== 'Tab' &&
                  e.key !== 'Enter' &&
                  e.key !== 'Delete' &&
                  e.key !== 'ArrowLeft' &&
                  e.key !== 'ArrowRight' &&
                  !isControlCommand
                ) {
                  e.preventDefault();
                }
              }}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#080594] focus:border-transparent outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Error message display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Submit Button - always uses default palette */}
          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full text-white py-3 rounded-full font-semibold text-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: defaultDark }}
          >
            {isLoading ? 'Verifying...' : 'Verify Access'}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-gray-400 text-sm mt-6">
          This area is restricted to authorized personnel only.
        </p>
      </div>
    </div>
  );
}
