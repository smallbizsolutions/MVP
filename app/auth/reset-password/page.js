'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user came from password reset email
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is in password recovery mode
        setMessage('Enter your new password below');
      }
    });
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage('Password updated successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f1419',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        background: '#1a2332',
        borderRadius: '8px',
        border: '1px solid #2d3748'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#f7fafc',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Set New Password
        </h2>
        
        <p style={{
          fontSize: '14px',
          color: '#a0aec0',
          textAlign: 'center',
          marginBottom: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          Choose a strong password for your account
        </p>

        {message && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#2f855a',
            color: '#f0fff4',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            background: '#c53030',
            color: '#fff5f5',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#e2e8f0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#0f1419',
                color: '#f7fafc',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#e2e8f0',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#0f1419',
                color: '#f7fafc',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            />
            <p style={{
              fontSize: '12px',
              color: '#718096',
              marginTop: '4px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
              Minimum 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: '#f7fafc',
              color: '#0f1419',
              fontSize: '14px',
              fontWeight: '500',
              opacity: loading ? 0.5 : 1,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
