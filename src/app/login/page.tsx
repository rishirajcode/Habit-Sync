import Auth from '@/components/Auth';

export default function LoginPage() {
    return (
        <main style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            background: 'var(--bg-primary)'
        }}>
            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 style={{ background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Habit Sync
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                    Build healthy habits, one day at a time.
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>

                    V-1.0.0 | Build by <a href="https://rishirajcode.in/" target="_blank" rel="noopener noreferrer" style={{ color: '#6E6E6E', textDecoration: 'none' }}>rishirajcode</a>

                </p>
            </div>
            <Auth />
        </main>
    );
}
