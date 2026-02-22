'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function Profile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const [profile, setProfile] = useState({
        full_name: '',
        age: '',
        sex: '',
        height: '',
        weight: '',
        blood_group: '',
        bmi: 0,
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            if (data) {
                setProfile({
                    full_name: data.full_name || '',
                    age: data.age || '',
                    sex: data.sex || '',
                    height: data.height || '',
                    weight: data.weight || '',
                    blood_group: data.blood_group || '',
                    bmi: data.bmi || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateBMI = (weight: number, heightCm: number) => {
        if (!weight || !heightCm) return 0;
        const heightM = heightCm / 100;
        return Number((weight / (heightM * heightM)).toFixed(1));
    };

    const getBMICategory = (bmi: number) => {
        if (bmi === 0) return { label: 'Not calculated', color: 'var(--text-secondary)' };
        if (bmi < 18.5) return { label: 'Underweight', color: '#f97316' }; // Orange
        if (bmi < 25) return { label: 'Normal', color: '#10b981' }; // Green
        if (bmi < 30) return { label: 'Overweight', color: '#ef4444' }; // Red
        return { label: 'Obese', color: '#991b1b' }; // Dark Red
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No user logged in');

            const weightNum = parseFloat(profile.weight as string);
            const heightNum = parseFloat(profile.height as string);

            const newBmi = calculateBMI(weightNum, heightNum);

            const updates = {
                id: session.user.id,
                full_name: profile.full_name,
                age: profile.age ? parseInt(profile.age as string) : null,
                sex: profile.sex,
                blood_group: profile.blood_group || null,
                height: heightNum || null,
                weight: weightNum || null,
                bmi: newBmi || null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;

            if (weightNum && weightNum.toString() !== profile.weight) {
                await supabase.from('weight_logs').insert([
                    { user_id: session.user.id, weight: weightNum }
                ]);
            }

            setProfile(prev => ({ ...prev, bmi: newBmi }));
            setMessage({ text: 'Profile updated successfully!', type: 'success' });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Error updating profile';
            setMessage({ text: errorMessage, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="glass-panel" style={{ padding: '20px' }}>Loading profile...</div>;

    const bmiCategory = getBMICategory(profile.bmi);

    const getAvatarIcon = () => {
        if (profile.sex === 'male') return '👨';
        if (profile.sex === 'female') return '👩';
        if (profile.sex === 'other') return '🧑';
        return '👤';
    };

    return (
        <div className="glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '40px', width: '70px', height: '70px', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-color)' }}>
                    {getAvatarIcon()}
                </div>
                <h2 style={{ margin: 0 }}>Your Profile</h2>
            </div>

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

            <form onSubmit={handleSave} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 100%, 400px), 1fr))',
                gap: '20px'
            }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Full Name</label>
                    <input className="input-field" name="full_name" value={profile.full_name} onChange={handleChange} placeholder="John Doe" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Age</label>
                    <input className="input-field" type="number" min="0" name="age" value={profile.age} onChange={handleChange} placeholder="25" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Sex</label>
                    <select className="input-field" name="sex" value={profile.sex} onChange={handleChange}>
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Height (cm)</label>
                    <input className="input-field" type="number" min="0" step="0.1" name="height" value={profile.height} onChange={handleChange} placeholder="175" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Weight (kg) <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>(Update via Progress Tab)</span></label>
                    <input className="input-field" type="number" min="0" step="0.1" name="weight" value={profile.weight} disabled readOnly style={{ cursor: 'not-allowed', opacity: 0.6 }} placeholder="70" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Blood Group</label>
                    <select className="input-field" name="blood_group" value={profile.blood_group || ''} onChange={handleChange}>
                        <option value="">Select...</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                </div>

                {profile.bmi > 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: `1px solid ${bmiCategory.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Current BMI</span>
                                <div style={{ fontSize: '24px', fontWeight: 700 }}>{profile.bmi}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Category</span>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: bmiCategory.color }}>{bmiCategory.label}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ gridColumn: '1 / -1', padding: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>BMI Categories Legend</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#f97316', fontWeight: 600 }}>Underweight</span><span style={{ color: 'var(--text-secondary)' }}>&lt; 18.5</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#10b981', fontWeight: 600 }}>Normal</span><span style={{ color: 'var(--text-secondary)' }}>18.5 - 24.9</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>Overweight</span><span style={{ color: 'var(--text-secondary)' }}>25.0 - 29.9</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#991b1b', fontWeight: 600 }}>Obese</span><span style={{ color: 'var(--text-secondary)' }}>&ge; 30.0</span></div>
                    </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}
