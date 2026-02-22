'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                const { data: prof } = await supabase.from('profiles').select('id, points, last_points_reset').eq('id', session.user.id).single();
                if (prof) {
                    const now = new Date();
                    const lastReset = prof.last_points_reset ? new Date(prof.last_points_reset) : new Date(0);
                    // If the month or year changed, reset points
                    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
                        await supabase.from('profiles').update({ points: 0, last_points_reset: now.toISOString() }).eq('id', session.user.id);
                    }
                }
                setLoading(false);
            }
        };

        checkUser();
        // Initialize theme state from document
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(currentTheme);
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="animate-pulse" style={{ fontSize: '24px', fontWeight: 600, color: 'var(--primary-color)' }}>
                    Habit Sync
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Mobile Top Bar */}
            <header className="mobile-only glass-panel" style={{
                padding: '12px 20px',
                borderRadius: '0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                borderLeft: 'none',
                borderRight: 'none',
                borderTop: 'none',
                width: '100%'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Image src="/logo.png" alt="Logo" width={32} height={32} style={{ borderRadius: '50%' }} />
                    <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '18px', fontWeight: 700 }}>Habit Sync</h2>
                </div>
                <button onClick={toggleTheme} style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                    marginLeft: 'auto'
                }}>
                    {theme === 'dark' ? '🌙' : '☀️'}
                </button>
            </header>

            <div style={{ display: 'flex', flex: 1, height: '100%' }}>
                {/* Desktop Sidebar */}
                <aside className="glass-panel desktop-only" style={{
                    width: '250px',
                    borderRadius: '0',
                    borderLeft: 'none',
                    borderTop: 'none',
                    borderBottom: 'none',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'sticky',
                    top: 0,
                    height: '100vh'
                }}>
                    <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Image src="/logo.png" alt="Logo" width={48} height={48} style={{ borderRadius: '50%', border: '2px solid var(--primary-color)' }} />
                        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Habit Sync</h2>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            Dashboard
                        </Link>
                        <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            Profile
                        </Link>
                        <Link href="/dashboard/graph" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            Progress
                        </Link>
                        <Link href="/dashboard/report" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            Weekly Report
                        </Link>
                        <Link href="/dashboard/monthly-report" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            Monthly Report
                        </Link>
                        <Link href="/dashboard/medicines" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', fontWeight: 500 }}>
                            💊 Medicines
                        </Link>
                    </nav>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                        <button className="theme-toggle" onClick={toggleTheme} style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            padding: '10px',
                            borderRadius: 'var(--radius-md)',
                            width: '100%',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            fontWeight: 500,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            Theme <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
                        </button>

                        <button onClick={handleLogout} style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '10px',
                            marginTop: '12px',
                            width: '100%',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            fontWeight: 500
                        }}>
                            Log Out
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, padding: 'clamp(16px, 5vw, 40px)', paddingBottom: '90px', width: '100%' }}>
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-only glass-panel" style={{
                position: 'fixed',
                bottom: '16px',
                left: '20px',
                right: '20px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                zIndex: 1000,
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
                <Link href="/dashboard" title="Home" style={{ fontSize: '24px', textDecoration: 'none' }}>🏠</Link>
                <Link href="/dashboard/graph" title="Progress" style={{ fontSize: '24px', textDecoration: 'none' }}>📈</Link>
                <Link href="/dashboard/medicines" title="Medicines" style={{ fontSize: '24px', textDecoration: 'none' }}>💊</Link>
                <Link href="/dashboard/report" title="Reports" style={{ fontSize: '24px', textDecoration: 'none' }}>📊</Link>
                <Link href="/dashboard/profile" title="Profile" style={{ fontSize: '24px', textDecoration: 'none' }}>👤</Link>
            </nav>
        </div>
    );
}
