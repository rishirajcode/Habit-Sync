'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

export default function MedicinesView() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [newName, setNewName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            setUser(session.user);

            const { data, error } = await supabase
                .from('user_medicines')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setMedicines(data);
        } catch (error) {
            console.error('Error fetching medicines:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMedicine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newName.trim()) return;

        setMessage('');
        const { data, error } = await supabase.from('user_medicines').insert([
            { user_id: user.id, name: newName.trim() }
        ]).select();

        if (error) {
            setMessage(`Error adding medicine: ${error.message}`);
        } else if (data) {
            setMedicines([data[0], ...medicines]);
            setNewName('');
        }
    };

    const handleDeleteMedicine = async (id: string) => {
        const { error } = await supabase.from('user_medicines').delete().eq('id', id);
        if (error) {
            setMessage(`Error deleting medicine: ${error.message}`);
        } else {
            setMedicines(medicines.filter(m => m.id !== id));
        }
    };

    if (loading) return <div className="glass-panel" style={{ padding: '24px' }}>Loading Medicines...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Medicines & Supplements</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage the list of medications and supplements you take.</p>
            </header>

            {message && (
                <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    {message}
                </div>
            )}

            <section className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
                <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>Add New Item</h2>
                <form onSubmit={handleAddMedicine} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        className="input-field"
                        type="text"
                        placeholder="e.g. Vitamin D3"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        style={{ maxWidth: '300px' }}
                        required
                    />
                    <button className="btn-primary" type="submit">
                        + Add to List
                    </button>
                </form>
            </section>

            <section className="glass-panel" style={{ padding: '24px' }}>
                <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '18px' }}>Your Inventory</h2>

                {medicines.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>You haven't added any medicines yet.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {medicines.map((med) => (
                            <li key={med.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 500, fontSize: '16px' }}>{med.name}</div>
                                <button onClick={() => handleDeleteMedicine(med.id)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
