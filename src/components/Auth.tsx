'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                window.location.href = '/dashboard';
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0], // Give a default name
                        }
                    }
                });
                if (error) throw error;
                setMessage('Check your email for the confirmation link!');
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            setMessage(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>
                {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '32px', color: 'var(--text-secondary)' }}>
                {isLogin ? 'Log in to continue your habit streaks' : 'Join us to track your daily health'}
            </p>

            {message && (
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-color)', marginBottom: '20px', textAlign: 'center' }}>
                    {message}
                </div>
            )}

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Email Address</label>
                    <input
                        className="input-field"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Password</label>
                    <input
                        className="input-field"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    className="btn-primary"
                    type="submit"
                    disabled={loading}
                    style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                    }}
                >
                    {isLogin ? 'Sign Up' : 'Log In'}
                </button>
            </div>
        </div>
    );
}
