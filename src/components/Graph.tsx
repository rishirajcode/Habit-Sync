'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';

import { User } from '@supabase/supabase-js';

interface WeightLog {
    id: string;
    user_id: string;
    weight: number;
    logged_at: string;
}

interface BPLog {
    id: string;
    user_id: string;
    systolic: number;
    diastolic: number;
    logged_at: string;
}

interface ChartData {
    date: string;
    weight: number | null;
}

export default function ProgressGraph() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [rawLogs, setRawLogs] = useState<WeightLog[]>([]);
    const [weightLogs, setWeightLogs] = useState<ChartData[]>([]);
    const [bpLogs, setBpLogs] = useState<BPLog[]>([]);
    const [newWeight, setNewWeight] = useState('');
    const [newSys, setNewSys] = useState('');
    const [newDia, setNewDia] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [timeRange, setTimeRange] = useState('7'); // '7' or '30'
    const graphRef = useRef<HTMLElement>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        filterDataForChart(rawLogs, timeRange);
    }, [rawLogs, timeRange]);

    const fetchLogs = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setUser(session.user);

            const { data, error } = await supabase
                .from('weight_logs')
                .select('*')
                .eq('user_id', session.user.id)
                .order('logged_at', { ascending: true });

            if (error) throw error;
            if (data) setRawLogs(data);

            const { data: bpData } = await supabase
                .from('blood_pressure_logs')
                .select('*')
                .eq('user_id', session.user.id)
                .order('logged_at', { ascending: false });

            if (bpData) setBpLogs(bpData);

        } catch (error) {
            console.error('Error fetching weight logs');
        } finally {
            setLoading(false);
        }
    };

    const filterDataForChart = (data: WeightLog[], days: string) => {
        if (!data) return;

        const numDays = parseInt(days);
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - numDays + 1);

        const generatedDates = [];
        for (let i = 0; i < numDays; i++) {
            const d = new Date(cutoff);
            d.setDate(d.getDate() + i);
            generatedDates.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }

        const dateToWeight: Record<string, number> = {};
        if (data.length > 0) {
            data.forEach(log => {
                const dDate = new Date(log.logged_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                dateToWeight[dDate] = Number(log.weight);
            });
        }

        const formattedData = generatedDates.map(dateStr => {
            return {
                date: dateStr,
                weight: dateToWeight[dateStr] !== undefined ? dateToWeight[dateStr] : null
            };
        });

        setWeightLogs(formattedData);
    };

    const handleLogWeight = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newWeight) return;

        // Check 24 hour limit
        if (rawLogs.length > 0) {
            const lastLogTime = new Date(rawLogs[rawLogs.length - 1].logged_at).getTime();
            const now = new Date().getTime();
            const hoursSinceLastLog = (now - lastLogTime) / (1000 * 60 * 60);

            if (hoursSinceLastLog < 24) {
                setMessage({ text: 'Warning: You can only log your weight once every 24 hours outside of Profile edits.', type: 'error' });
                return;
            }
        }

        setLoading(true);

        try {
            const weightNum = parseFloat(newWeight);

            // 1. Insert into weight_logs
            const { error: logError } = await supabase.from('weight_logs').insert([
                { user_id: user.id, weight: weightNum }
            ]);
            if (logError) throw logError;

            // 2. Fetch current profile to calculate new BMI (removed points logic)
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

            if (profile) {
                let newBmi = profile.bmi;
                if (profile.height) {
                    const heightM = profile.height / 100;
                    newBmi = Number((weightNum / (heightM * heightM)).toFixed(1));
                }

                await supabase.from('profiles').update({
                    weight: weightNum,
                    bmi: newBmi,
                    updated_at: new Date().toISOString()
                }).eq('id', user.id);
            }

            setMessage({ text: 'Weight logged successfully!', type: 'success' });
            setNewWeight('');
            fetchLogs(); // refresh chart

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error logging weight';
            setMessage({ text: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogBP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newSys || !newDia) return;

        // Check limit of 2 logs per day
        const today = new Date().toDateString();
        const logsToday = bpLogs.filter(log => new Date(log.logged_at).toDateString() === today);

        if (logsToday.length >= 2) {
            setMessage({ text: 'Warning: You can only log your blood pressure 2 times a day.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('blood_pressure_logs').insert([
                { user_id: user.id, systolic: parseInt(newSys), diastolic: parseInt(newDia) }
            ]);

            if (error) throw error;

            setMessage({ text: 'Blood pressure logged successfully!', type: 'success' });
            setNewSys('');
            setNewDia('');
            fetchLogs(); // refresh all logs
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error logging blood pressure';
            setMessage({ text: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const captureScreenshot = async () => {
        if (graphRef.current) {
            const canvas = await html2canvas(graphRef.current, { backgroundColor: null });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `progress-graph-${timeRange}days.png`;
            link.href = dataUrl;
            link.click();
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{
                marginBottom: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>Progress</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Weight & Vitals</p>
                </div>
                <button className="btn-primary" onClick={captureScreenshot} style={{ background: 'var(--secondary-color)', fontSize: '14px' }}>
                    📸 Save
                </button>
            </header>

            {message.text && (
                <div style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: message.type === 'error' ? '#ef4444' : '#10b981'
                }}>
                    {message.text}
                </div>
            )}

            {/* Log Weight Form */}
            <section className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
                <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>Log Today's Weight</h2>
                <form onSubmit={handleLogWeight} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        className="input-field"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Weight (kg)"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        style={{ flex: 1, minWidth: '120px' }}
                        required
                        disabled={loading}
                    />
                    <button className="btn-primary" type="submit" disabled={loading} style={{ flex: 'none' }}>
                        {loading ? '...' : 'Log Weight'}
                    </button>
                </form>
            </section>

            {/* Chart */}
            <section ref={graphRef} className="glass-panel" style={{ padding: '24px', height: '450px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>History</h2>
                    <select className="input-field" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{ width: 'auto', padding: '8px 12px' }}>
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                    {weightLogs.length === 0 && !loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                            No weight logs in this period.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightLogs} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--primary-color)' }}
                                />
                                <Line
                                    connectNulls
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="var(--primary-color)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--primary-color)' }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </section>
            {/* BP Logs */}
            <section className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
                <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>Blood Pressure Logs</h2>
                <form onSubmit={handleLogBP} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <input className="input-field" type="number" min="0" placeholder="Sys" value={newSys} onChange={(e) => setNewSys(e.target.value)} style={{ flex: 1, minWidth: '70px' }} required disabled={loading} />
                    <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>/</span>
                    <input className="input-field" type="number" min="0" placeholder="Dia" value={newDia} onChange={(e) => setNewDia(e.target.value)} style={{ flex: 1, minWidth: '70px' }} required disabled={loading} />
                    <button className="btn-primary" type="submit" disabled={loading} style={{ background: '#ef4444', flex: 'none' }}>
                        + Record
                    </button>
                </form>

                {bpLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No blood pressure logs found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '12px 8px' }}>Date</th>
                                    <th style={{ padding: '12px 8px' }}>Time</th>
                                    <th style={{ padding: '12px 8px' }}>Systolic / Diastolic</th>
                                    <th style={{ padding: '12px 8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bpLogs.slice(0, 10).map((log) => {
                                    const d = new Date(log.logged_at);
                                    let statusColor = '#10b981';
                                    let statusText = 'Normal';
                                    if (log.systolic >= 130 || log.diastolic >= 80) { statusColor = '#ef4444'; statusText = 'High'; }
                                    else if (log.systolic <= 90 || log.diastolic <= 60) { statusColor = '#f97316'; statusText = 'Low'; }

                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 8px' }}>{d.toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 8px' }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>{log.systolic} / {log.diastolic} mmHg</td>
                                            <td style={{ padding: '12px 8px', color: statusColor, fontWeight: 500 }}>{statusText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
