'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import html2canvas from 'html2canvas';

export default function MonthlyReport() {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        weightChange: 0,
        bmiChange: 0,
        waterAverage: 0,
        streak: 0,
        bestStreak: 0,
        totalPoints: 0,
        totalLogs: 0
    });

    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        generateReport();
    }, []);

    const generateReport = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const userId = session.user.id;

            let weightChange = 0;
            let bmiChange = 0;
            let waterAverage = 0;
            let totalLogs = 0;

            const cutoff = new Date();
            cutoff.setHours(0, 0, 0, 0);
            cutoff.setDate(1);

            // 1. Fetch Profile
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

            // 2. Fetch Weight Logs
            const { data: weightLogs } = await supabase.from('weight_logs').select('*')
                .eq('user_id', userId)
                .gte('logged_at', cutoff.toISOString())
                .order('logged_at', { ascending: true });

            if (weightLogs && weightLogs.length > 1) {
                const first = weightLogs[0].weight;
                const last = weightLogs[weightLogs.length - 1].weight;
                weightChange = Number((last - first).toFixed(1));

                if (profile?.height) {
                    const hm = profile.height / 100;
                    const firstBmi = first / (hm * hm);
                    const lastBmi = last / (hm * hm);
                    bmiChange = Number((lastBmi - firstBmi).toFixed(1));
                }
            }

            // 3. Fetch Water Logs
            const { data: waterLogs } = await supabase.from('water_logs').select('*')
                .eq('user_id', userId)
                .gte('logged_at', cutoff.toISOString());

            if (waterLogs && waterLogs.length > 0) {
                totalLogs = waterLogs.length;

                // Group by day to find average
                const logsByDate: { [key: string]: number } = {};
                let totalMl = 0;

                waterLogs.forEach(log => {
                    const d = new Date(log.logged_at).toDateString();
                    logsByDate[d] = (logsByDate[d] || 0) + log.amount_ml;
                    totalMl += log.amount_ml;
                });

                const uniqueDays = Object.keys(logsByDate).length;
                waterAverage = Math.floor(totalMl / uniqueDays);
            }

            setReportData({
                weightChange,
                bmiChange,
                waterAverage,
                streak: profile?.current_streak || 0,
                bestStreak: profile?.best_streak || 0,
                totalPoints: profile?.points || 0,
                totalLogs
            });

        } catch (e: unknown) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const captureScreenshot = async () => {
        if (reportRef.current) {
            // Provide a white background to avoid transparent sections in PNG mode
            const canvas = await html2canvas(reportRef.current, { backgroundColor: '#ffffff' });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `monthly-report.png`;
            link.href = dataUrl;
            link.click();
        }
    };

    if (loading) return <div className="glass-panel" style={{ padding: '24px' }}>Generating your monthly report...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ color: 'var(--primary-color)' }}>Monthly Report</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>A summary of your journey over the last 30 days.</p>
                </div>
                <button className="btn-primary" onClick={captureScreenshot} style={{ background: 'var(--secondary-color)' }}>
                    📸 Save Screenshot
                </button>
            </header>

            <div ref={reportRef} style={{ padding: '20px', borderRadius: '12px', background: 'var(--bg-primary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    {/* Weight & BMI */}
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Weight Change</h3>
                        <div style={{ fontSize: '32px', fontWeight: 700, margin: '12px 0', color: reportData.weightChange > 0 ? '#ef4444' : (reportData.weightChange < 0 ? '#10b981' : 'var(--text-primary)') }}>
                            {reportData.weightChange > 0 ? '+' : ''}{reportData.weightChange} kg
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Over 30 days</p>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>BMI Change</h3>
                        <div style={{ fontSize: '32px', fontWeight: 700, margin: '12px 0', color: reportData.bmiChange > 0 ? '#ef4444' : (reportData.bmiChange < 0 ? '#10b981' : 'var(--text-primary)') }}>
                            {reportData.bmiChange > 0 ? '+' : ''}{reportData.bmiChange}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Over 30 days</p>
                    </div>

                    {/* Water Intake */}
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Avg Daily Water</h3>
                        <div style={{ fontSize: '32px', fontWeight: 700, margin: '12px 0', color: '#3b82f6' }}>
                            {(reportData.waterAverage / 1000).toFixed(2)} L
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Over 30 days</p>
                    </div>

                    {/* Streaks & Points */}
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Best Streak</h3>
                        <div style={{ fontSize: '32px', fontWeight: 700, margin: '12px 0', color: 'var(--accent-color)' }}>
                            {Math.max(reportData.streak, reportData.bestStreak)} 🔥
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Consecutive days active</p>
                    </div>
                </div>

                <section className="glass-panel" style={{ padding: '32px' }}>
                    <h2 style={{ margin: 0, marginBottom: '24px', fontSize: '20px' }}>Achievement Overview</h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '40px' }}>🌟</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>Total Points Earned</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', marginTop: '4px' }}>You have accumulated {reportData.totalPoints} points.</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '40px' }}>💧</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>Hydration Champion</h3>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', marginTop: '4px' }}>Total water tracking sessions in 30 days: {reportData.totalLogs}</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
