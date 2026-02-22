import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <h1 className="animate-fade-in">Welcome to Habit Sync</h1>
          <p className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Track your health, maintain wellness streaks, and earn points!
          </p>
          <div style={{ marginTop: '20px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary animate-fade-in" style={{ animationDelay: '0.2s', width: 'auto' }}>
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </header>
    </main>
  );
}
