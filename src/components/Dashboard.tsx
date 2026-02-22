'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
    id: string;
    full_name?: string;
    points?: number;
    current_streak?: number;
    best_streak?: number;
    last_active_date?: string;
}

interface WaterLog {
    id: string;
    user_id: string;
    amount_ml: number;
    logged_at: string;
}

interface Medicine {
    id: string;
    user_id: string;
    name: string;
}

interface MedicineReminder {
    id: string;
    user_id: string;
    medicine_name: string;
    reminder_time: string;
    reminder_type: string;
    is_active: boolean;
}

interface WaterReminder {
    id: string;
    user_id: string;
    reminder_type: string;
    start_time: string;
    is_active: boolean;
}

const tips = [
    "Drink at least 8 glasses of water a day.",
    "A 15-minute walk can significantly boost your mood.",
    "Consistency is key. A short workout every day is better than one long weekly session.",
    "Sleep at least 7-8 hours a night to help your body recover.",
    "Incorporate more leafy greens into your diet.",
    "Stretch for 5 minutes after sitting for long periods.",
    "Mindfulness and meditation can lower stress levels.",
    "\"The only bad workout is the one that didn't happen.\"",
    "\"Take care of your body. It's the only place you have to live.\"",
    "\"Success is the sum of small efforts, repeated day in and day out.\""
];

export default function DashboardView() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    // Water State
    const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
    const waterGlasses = waterLogs.length; // 250ml per glass

    // Medicine State
    const [userMedicines, setUserMedicines] = useState<Medicine[]>([]);
    const [medicines, setMedicines] = useState<MedicineReminder[]>([]);
    const [newMedId, setNewMedId] = useState('');
    const [newMedTime, setNewMedTime] = useState('');
    const [newMedType, setNewMedType] = useState('daily');

    // Water Reminder State
    const [waterReminders, setWaterReminders] = useState<WaterReminder[]>([]);
    const [newWaterRemType, setNewWaterRemType] = useState('once');
    const [newWaterRemTime, setNewWaterRemTime] = useState('');

    // Notifications & Audio
    const audioContextRef = useRef<AudioContext | null>(null);
    const [showAchievement, setShowAchievement] = useState(false);
    const [activeReminder, setActiveReminder] = useState<{ title: string, body: string } | null>(null);

    const [healthTip, setHealthTip] = useState('');
    const lastDayRef = useRef(new Date().toDateString());
    const medsRef = useRef(medicines);
    const waterRemsRef = useRef(waterReminders);

    useEffect(() => { medsRef.current = medicines; }, [medicines]);
    useEffect(() => { waterRemsRef.current = waterReminders; }, [waterReminders]);

    const playBeep = useCallback(() => {
        if (!audioContextRef.current) {
            // @ts-expect-error - webkitAudioContext is for legacy Safari
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;
        if (ctx) {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        }
    }, []);

    const showNotification = useCallback((title: string, body: string) => {
        playBeep();
        setActiveReminder({ title, body });
        setTimeout(() => setActiveReminder(null), 10000);

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        }
    }, [playBeep]);

    const playAchievementSound = useCallback(() => {
        if (!audioContextRef.current) {
            // @ts-expect-error - webkitAudioContext is for legacy Safari
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const playTone = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
            gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
            gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + start + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + duration);
        };

        playTone(523.25, 0, 0.2);
        playTone(659.25, 0.1, 0.2);
        playTone(783.99, 0.2, 0.4);
        playTone(1046.50, 0.3, 0.8);
    }, []);

    const checkAndUpdateStreak = useCallback(async (sessionUser: User, currentProfile: Profile) => {
        if (!currentProfile) return currentProfile;

        const now = new Date();
        const todayStr = now.toDateString();
        const lastActiveStr = currentProfile.last_active_date ? new Date(currentProfile.last_active_date).toDateString() : '';

        let updatedProfile = { ...currentProfile };

        if (todayStr !== lastActiveStr) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            let newStreak = currentProfile.current_streak || 0;
            let newBest = currentProfile.best_streak || 0;

            if (lastActiveStr === yesterday.toDateString()) {
                newStreak += 1;
            } else {
                newStreak = 1;
            }
            if (newStreak > newBest) newBest = newStreak;

            const updates = {
                current_streak: newStreak,
                best_streak: newBest,
                last_active_date: now.toISOString()
            };

            await supabase.from('profiles').update(updates).eq('id', sessionUser.id);
            updatedProfile = { ...updatedProfile, ...updates };
        }
        return updatedProfile;
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setUser(session.user);

            const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (prof) {
                const refreshedProf = await checkAndUpdateStreak(session.user, prof);
                setProfile(refreshedProf);
            }

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data: wLogs } = await supabase
                .from('water_logs')
                .select('*')
                .eq('user_id', session.user.id)
                .gte('logged_at', startOfDay.toISOString())
                .order('logged_at', { ascending: true });

            if (wLogs) setWaterLogs(wLogs);

            const { data: meds } = await supabase.from('medicine_reminders').select('*')
                .eq('user_id', session.user.id).eq('is_active', true);
            if (meds) setMedicines(meds);

            const { data: uMeds } = await supabase.from('user_medicines').select('*')
                .eq('user_id', session.user.id).order('name', { ascending: true });
            if (uMeds) setUserMedicines(uMeds);

            const { data: wRems } = await supabase.from('water_reminders').select('*')
                .eq('user_id', session.user.id).eq('is_active', true);
            if (wRems) setWaterReminders(wRems);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [checkAndUpdateStreak]);

    const checkReminders = useCallback(() => {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[now.getDay()];

        medsRef.current.forEach(med => {
            const [h, m] = med.reminder_time.split(':').map(Number);
            let shouldRemind = false;

            if (med.reminder_type === 'daily') {
                if (h === currentH && m === currentM) shouldRemind = true;
            } else if (med.reminder_type === currentDayName) {
                if (h === currentH && m === currentM) shouldRemind = true;
            } else if (med.reminder_type === 'weekly' || !med.reminder_type) {
                if (h === currentH && m === currentM) shouldRemind = true;
            }

            if (shouldRemind) {
                showNotification("Medicine Reminder", `Time to take your medicine: ${med.medicine_name}`);
            }
        });

        waterRemsRef.current.forEach(rem => {
            const [h, m] = rem.start_time.split(':').map(Number);
            let shouldRemind = false;

            if (rem.reminder_type === 'once') {
                if (h === currentH && m === currentM) {
                    shouldRemind = true;
                    supabase.from('water_reminders').delete().eq('id', rem.id).then(({ error }) => {
                        if (!error) {
                            setWaterReminders(prev => prev.filter(r => r.id !== rem.id));
                        }
                    });
                }
            } else if (rem.reminder_type === 'daily' || rem.reminder_type === 'weekly') {
                if (h === currentH && m === currentM) shouldRemind = true;
            } else if (rem.reminder_type === '1hr' || rem.reminder_type === '2hrs') {
                const intervalH = rem.reminder_type === '1hr' ? 1 : 2;
                if (m === currentM && (currentH - h) >= 0 && (currentH - h) % intervalH === 0) {
                    shouldRemind = true;
                }
            } else if (rem.reminder_type === '3hrs') {
                if (m === currentM && (currentH - h) >= 0 && (currentH - h) % 3 === 0) {
                    shouldRemind = true;
                }
            }

            if (shouldRemind) {
                showNotification("Water Reminder", "Time to drink a glass of water! 💧");
            }
        });
    }, [showNotification]);

    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        fetchData();
        const today = new Date().getDay();
        setHealthTip(tips[today % tips.length]);

        const interval = setInterval(() => {
            checkReminders();
            const currentDay = new Date().toDateString();
            if (lastDayRef.current && lastDayRef.current !== currentDay) {
                lastDayRef.current = currentDay;
                fetchData();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchData, checkReminders]);

    const handleLogWater = async () => {
        if (!user) return;
        const currentAmount = waterGlasses * 250;
        if (currentAmount >= 3000) {
            alert("Upgrade the application to log more than 3000 ml of water per day.");
            return;
        }

        const { data, error } = await supabase.from('water_logs').insert([
            { user_id: user.id, amount_ml: 250 }
        ]).select();

        if (!error && data) {
            const newLogs = [...waterLogs, data[0]];
            setWaterLogs(newLogs);

            if (newLogs.length === 12) {
                setShowAchievement(true);
                playAchievementSound();
                setTimeout(() => setShowAchievement(false), 5000);
            }

            if (profile) {
                const newPoints = (profile.points || 0) + 2;
                await supabase.from('profiles').update({ points: newPoints }).eq('id', user.id);
                setProfile({ ...profile, points: newPoints });
            }
        }
    };

    const handleRemoveWater = async () => {
        if (!user || waterLogs.length === 0) return;

        const lastLog = waterLogs[waterLogs.length - 1];
        const { error } = await supabase.from('water_logs').delete().eq('id', lastLog.id);

        if (error) { alert(`Failed to remove water: ${error.message}`); return; }

        setWaterLogs(waterLogs.slice(0, -1));
        if (profile) {
            const currentPoints = profile.points ?? 0;
            if (currentPoints >= 2) {
                await supabase.from('profiles').update({ points: currentPoints - 2 }).eq('id', user.id);
                setProfile({ ...profile, points: currentPoints - 2 });
            }
        }
    };

    const handleResetWater = async () => {
        if (!user || waterLogs.length === 0) return;
        const confirm = window.confirm("Are you sure you want to reset today's water intake? This will delete all logs for today.");
        if (!confirm) return;

        const ids = waterLogs.map(l => l.id);
        const { error } = await supabase.from('water_logs').delete().in('id', ids);

        if (error) { alert(`Failed to reset: ${error.message}`); return; }

        setWaterLogs([]);
        if (profile) {
            const pointsToDeduct = waterLogs.length * 2;
            const currentPoints = profile.points ?? 0;
            const newPoints = Math.max(0, currentPoints - pointsToDeduct);
            await supabase.from('profiles').update({ points: newPoints }).eq('id', user.id);
            setProfile({ ...profile, points: newPoints });
        }
    };

    const handleAddMedicine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || (!newMedId && userMedicines.length === 0) || !newMedTime) return;

        const selectedMed = userMedicines.find(m => m.id === newMedId) || userMedicines[0];
        if (!selectedMed) return;

        const timeFormatted = newMedTime.length === 5 ? `${newMedTime}:00` : newMedTime;
        const { data, error } = await supabase.from('medicine_reminders').insert([
            { user_id: user.id, medicine_name: selectedMed.name, reminder_time: timeFormatted, reminder_type: newMedType }
        ]).select();

        if (error) {
            alert(`Error saving medicine reminder: ${error.message}`);
            return;
        }

        if (data) {
            setMedicines([...medicines, data[0]]);
            setNewMedTime('');
        }
    };

    const handleDeleteMedicine = async (id: string) => {
        const { error } = await supabase.from('medicine_reminders').delete().eq('id', id);
        if (!error) setMedicines(medicines.filter(m => m.id !== id));
    };

    const handleAddWaterReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newWaterRemTime) return;
        const timeFormatted = newWaterRemTime.length === 5 ? `${newWaterRemTime}:00` : newWaterRemTime;
        const { data, error } = await supabase.from('water_reminders').insert([
            { user_id: user.id, reminder_type: newWaterRemType, start_time: timeFormatted }
        ]).select();

        if (error) {
            alert(`Error saving water reminder: ${error.message}`);
            return;
        }

        if (data) {
            setWaterReminders([...waterReminders, data[0]]);
            setNewWaterRemTime('');
        }
    };

    const handleDeleteWaterReminder = async (id: string) => {
        const { error } = await supabase.from('water_reminders').delete().eq('id', id);
        if (!error) setWaterReminders(waterReminders.filter(r => r.id !== id));
    };

    if (loading) return <div>Loading dashboard...</div>;

    const getGlassColor = (index: number, total: number) => {
        if (index >= total) return '#ef4444';
        if (total <= 4) return '#eab308';
        if (total <= 6) return '#f97316';
        return '#10b981';
    };

    const maxGlassesToDisplay = Math.max(8, waterGlasses);
    const avatarStats = { emoji: '😊', title: 'Happy User' };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="desktop-only" style={{ fontSize: '48px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`Avatar Status: ${avatarStats.title}`}>
                        {avatarStats.emoji}
                    </div>
                    <div>
                        <h1 style={{ color: 'var(--primary-color)', margin: 0, marginBottom: '4px' }}>
                            <span className="mobile-only">{avatarStats.emoji} </span>
                            Hello, {profile?.full_name?.split(' ')[0] || 'User'}!
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Ready to conquer today?</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', maxWidth: '400px', justifyContent: 'flex-start' }}>
                    <div className="glass-panel" style={{ padding: '12px 16px', flex: 1, textAlign: 'center', position: 'relative' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Points</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>{profile?.points || 0} ✨</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '12px 16px', flex: 1, textAlign: 'center', position: 'relative' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Streak</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)' }}>{profile?.current_streak || 0} 🔥</div>
                    </div>
                </div>
            </header>

            <div className="animate-fade-in" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.1), rgba(20,184,166,0.1))', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>💡</div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--primary-color)' }}>Daily Health Tip</h3>
                    <p style={{ margin: 0, marginTop: '4px', fontSize: '18px', fontWeight: 500 }}>{healthTip}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(250px, 100%, 400px), 1fr))', gap: '24px' }}>
                <section className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px' }}>Water Intake</h2>
                            <button onClick={handleResetWater} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)' }} title="Reset Today's Water">🔄</button>
                        </div>
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>{waterGlasses * 250} ml / 3000 ml</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                        {Array.from({ length: maxGlassesToDisplay }).map((_, i) => (
                            <div key={i} style={{ width: '40px', height: '40px', borderRadius: '50%', background: i < waterGlasses ? getGlassColor(i, waterGlasses) : 'var(--bg-secondary)', border: `2px solid ${getGlassColor(i, waterGlasses)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)' }}>
                                💧
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', flexDirection: 'row' }}>
                        <button className="btn-primary" onClick={handleLogWater} style={{ flex: 1, background: '#3b82f6', padding: '12px' }} disabled={waterGlasses * 250 >= 3000}>Add 250ml</button>
                        <button className="btn-primary" onClick={handleRemoveWater} style={{ flex: 1, background: 'var(--accent-color)', padding: '12px' }} disabled={waterGlasses === 0}>Remove</button>
                    </div>
                </section>

                <section className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>Water Reminders</h2>
                        <span style={{ fontSize: '20px' }}>⏰</span>
                    </div>

                    <form onSubmit={handleAddWaterReminder} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <select className="input-field" value={newWaterRemType} onChange={(e) => setNewWaterRemType(e.target.value)} required>
                            <option value="once">Only Once</option>
                            <option value="1hr">Every 1 Hr</option>
                            <option value="2hrs">Every 2 Hrs</option>
                        </select>
                        <input className="input-field" type="time" value={newWaterRemTime} onChange={(e) => setNewWaterRemTime(e.target.value)} required />
                        <button className="btn-primary" type="submit" style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>+ Add</button>
                    </form>

                    {waterReminders.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No water reminders set.</p> : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {waterReminders.map(rem => (
                                <li key={rem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{rem.reminder_type}</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Start Time: {rem.start_time.slice(0, 5)}</div>
                                    </div>
                                    <button onClick={() => handleDeleteWaterReminder(rem.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>Medicine Reminders</h2>
                        <span style={{ fontSize: '20px' }}>💊</span>
                    </div>

                    <form onSubmit={handleAddMedicine} style={{ display: 'flex', gap: '12px', marginBottom: '24px', maxWidth: '600px', flexWrap: 'wrap' }}>
                        {userMedicines.length === 0 ? (
                            <div style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                                You have no medicines in inventory. Go to the <strong>Medicines</strong> tab to add some!
                            </div>
                        ) : (
                            <>
                                <select className="input-field" value={newMedId} onChange={(e) => setNewMedId(e.target.value)} required style={{ minWidth: '150px' }}>
                                    {userMedicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <select className="input-field" value={newMedType} onChange={(e) => setNewMedType(e.target.value)} required style={{ minWidth: '120px' }}>
                                    <option value="daily">Daily</option>
                                    <option value="monday">Monday</option>
                                    <option value="tuesday">Tuesday</option>
                                    <option value="wednesday">Wednesday</option>
                                    <option value="thursday">Thursday</option>
                                    <option value="friday">Friday</option>
                                    <option value="saturday">Saturday</option>
                                    <option value="sunday">Sunday</option>
                                </select>
                                <input className="input-field" type="time" value={newMedTime} onChange={(e) => setNewMedTime(e.target.value)} required />
                                <button className="btn-primary" type="submit" style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>+ Add</button>
                            </>
                        )}
                    </form>

                    {medicines.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No medicine reminders.</p> : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {medicines.map(med => (
                                <li key={med.id} style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{med.medicine_name} <span style={{ fontSize: '12px', fontWeight: 'normal', textTransform: 'capitalize' }}>({med.reminder_type || 'daily'})</span></div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Time: {med.reminder_time.slice(0, 5)}</div>
                                    </div>
                                    <button onClick={() => handleDeleteMedicine(med.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {showAchievement && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
                        <div className="achievement-popup glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px', width: '90%', position: 'relative', border: '2px solid #f59e0b', boxShadow: '0 20px 50px rgba(245, 158, 11, 0.3)' }}>
                            <div className="achievement-icon" style={{ fontSize: '72px', marginBottom: '20px' }}>🏆</div>
                            <h2 style={{ color: '#f59e0b', fontSize: '28px', margin: '0 0 8px 0' }}>Goal Reached!</h2>
                            <p style={{ fontSize: '18px', margin: '0 0 24px 0', color: 'var(--text-primary)' }}>You've officially conquered your 3000ml water goal for today! 💧✨</p>
                            <div style={{ background: '#f59e0b', color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-block', cursor: 'pointer' }} onClick={() => setShowAchievement(false)}>Awesome!</div>
                        </div>
                    </div>
                )}

                {activeReminder && (
                    <div className="reminder-popup-container">
                        <div className="reminder-popup-content glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--primary-color)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
                            <div style={{ fontSize: '32px' }}>{activeReminder.title.toLowerCase().includes('water') ? '💧' : '💊'}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '18px' }}>{activeReminder.title}</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{activeReminder.body}</div>
                            </div>
                            <button onClick={() => setActiveReminder(null)} style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontWeight: 600 }}>Got it!</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
