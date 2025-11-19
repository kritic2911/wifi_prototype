import sqlite3
import os

DB_PATH = 'wifi_system.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            tier TEXT,
            cap_mbps REAL
        )
    ''')

    # Access Points table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS access_points (
            id TEXT PRIMARY KEY,
            band TEXT,
            location TEXT,
            x_coord INTEGER,
            y_coord INTEGER
        )
    ''')

    # Device Logs table (for analytics and security)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            device_id TEXT,
            user_id INTEGER,
            ap_id TEXT,
            bytes_transferred INTEGER,
            duration_seconds INTEGER,
            protocol TEXT,
            jitter_ms REAL,
            is_anomaly BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (ap_id) REFERENCES access_points (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def seed_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if data exists
    cursor.execute('SELECT count(*) FROM users')
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Seed Users
    users = [
        ('alice@uni.com', 'Student', 'University', 10.0),
        ('bob@corp.com', 'Faculty', 'University', 20.0),
        ('carol@guest.com', 'Guest', 'Guest', 2.0),
        ('dave@public.com', 'Public', 'Public Paid', 5.0)
    ]
    cursor.executemany('INSERT INTO users (username, role, tier, cap_mbps) VALUES (?, ?, ?, ?)', users)

    # Seed APs
    aps = [
        ('AP-1', '2.4GHz', 'Library', 10, 10),
        ('AP-2', '5GHz', 'Lecture Hall', 50, 20),
        ('AP-3', '2.4GHz', 'Cafeteria', 30, 80)
    ]
    cursor.executemany('INSERT INTO access_points (id, band, location, x_coord, y_coord) VALUES (?, ?, ?, ?, ?)', aps)
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    seed_data()
    print("Database initialized and seeded.")
