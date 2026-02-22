import Profile from '@/components/Profile';

export default function ProfilePage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ color: 'var(--primary-color)' }}>Profile Details</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Update your personal information to keep your BMI and streaks accurate.
                </p>
            </header>

            <Profile />
        </div>
    );
}
