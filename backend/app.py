from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
import random
import time
import os
from database import get_db_connection, init_db, seed_data
from ai_engine.security import AnomalyDetector
from ai_engine.forecasting import TrafficForecaster
from ai_engine.analytics import generate_heatmap
from ai_engine.rules import RuleEngine

app = Flask(__name__)
# Allow all origins for now to simplify deployment, or configure specific domains
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize DB on startup
if not os.path.exists('wifi_system.db'):
    init_db()
    seed_data()

# Initialize AI models
anomaly_detector = AnomalyDetector()
forecaster = TrafficForecaster()
rule_engine = RuleEngine()

# Global flag for verification
force_anomaly_flag = False

@app.route('/api/network-status', methods=['GET'])
def get_network_status():
    global force_anomaly_flag
    conn = get_db_connection()
    aps = conn.execute('SELECT * FROM access_points').fetchall()
    users = conn.execute('SELECT * FROM users').fetchall()
    conn.close()
    
    # Simulate dynamic load
    ap_data = []
    for ap in aps:
        # Simulate load variation
        load = random.randint(10, 90)
        ap_data.append({
            'id': ap['id'],
            'band': ap['band'],
            'load': load,
            'x': ap['x_coord'],
            'y': ap['y_coord'],
            'location': ap['location'],
            'neighbours': ['AP-2'] if ap['id'] == 'AP-1' else ['AP-1'] # Simplified
        })
        
    device_data = []
    active_users_count = 0
    for user in users:
        # Randomly active
        if random.random() > 0.2:
            active_users_count += 1
            
            if force_anomaly_flag:
                jitter = 150 # Extreme jitter
                bytes_transferred = 5000 # High bytes
                duration = 300 # Long duration
            else:
                jitter = random.randint(5, 60)
                bytes_transferred = random.randint(100, 1000)
                duration = random.randint(10, 120)
            
            # Anomaly Detection
            is_anomaly = anomaly_detector.predict([jitter, bytes_transferred, duration])
            
            # Rule Engine
            ap_id = random.choice(aps)['id']
            location = next(a['location'] for a in aps if a['id'] == ap_id)
            action = 'Streaming' if random.random() > 0.7 else 'Browsing'
            
            rule_result = rule_engine.evaluate({
                'role': user['role'],
                'location': location,
                'action': action,
                'current_load': 50 # Mock load
            })
            
            device_data.append({
                'user': user['username'],
                'ap': ap_id,
                'supports5g': True,
                'jitter': jitter,
                'pattern': 'stable' if jitter < 40 else 'burst',
                'classification': 'Anomaly' if is_anomaly else rule_result['decision'],
                'priority': 'High' if user['role'] == 'Faculty' else 'Normal',
                'is_anomaly': bool(is_anomaly)
            })
    
    # Reset flag after one iteration if it was set
    if force_anomaly_flag:
        force_anomaly_flag = False
    
    # Update forecast history
    forecaster.update_history(active_users_count)

    return jsonify({
        'aps': ap_data,
        'devices': device_data,
        'timestamp': time.time()
    })

@app.route('/api/security-scan', methods=['POST'])
def trigger_scan():
    global force_anomaly_flag
    force_anomaly_flag = True
    return jsonify({'status': 'Scan initiated - Anomaly forced for next poll', 'anomalies_found': 1})

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    conn = get_db_connection()
    aps = conn.execute('SELECT * FROM access_points').fetchall()
    conn.close()
    
    ap_data = []
    for ap in aps:
        ap_data.append({
            'x': ap['x_coord'],
            'y': ap['y_coord'],
            'load': random.randint(20, 90) # Mock load for visualization
        })
        
    image_data = generate_heatmap(ap_data)
    return jsonify({'image': image_data})

@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    prediction = forecaster.predict_next()
    return jsonify({
        'predicted_load': prediction,
        'history': forecaster.history
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
