from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime
import json
import random
import time
import os

app = Flask(__name__)

# Render-specific configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PREFERRED_URL_SCHEME='https'  # Force HTTPS on Render
)

# Mock database (your existing code)
class SafetyDatabase:
    def __init__(self):
        self.incidents = []
        self.emergencies = []
        self.safety_scores = {}
        self.patrols = [
            {'id': 'P001', 'name': 'Campus Security A', 'status': 'available', 'location': {'lat': 28.6139, 'lng': 77.2295}},
            {'id': 'P002', 'name': 'Campus Security B', 'status': 'patrolling', 'location': {'lat': 28.6129, 'lng': 77.2305}},
            {'id': 'P003', 'name': 'Rapid Response', 'status': 'available', 'location': {'lat': 28.6149, 'lng': 77.2285}}
        ]
        self.users = {
            'user123': {
                'name': 'Priya Sharma',
                'id': 'STU2024001',
                'email': 'priya.sharma@campus.edu',
                'phone': '+91-9876543210',
                'emergency_contacts': [
                    {'name': 'Parent', 'phone': '+91-9876543211', 'relationship': 'Parent'},
                    {'name': 'Best Friend', 'phone': '+91-9876543212', 'relationship': 'Friend'}
                ],
                'medical_info': 'None',
                'battery_level': 85
            }
        }
        self.initialize_safety_scores()
    
    def initialize_safety_scores(self):
        campus_locations = {
            'library_main': {'name': 'Library Main Entrance', 'score': 4.2, 'reports': 3},
            'hostel_a': {'name': 'Girls Hostel A Block', 'score': 4.5, 'reports': 1},
            'parking_north': {'name': 'North Parking Lot', 'score': 2.8, 'reports': 8},
            'cafeteria': {'name': 'Main Cafeteria', 'score': 4.0, 'reports': 2},
            'sports_complex': {'name': 'Sports Complex', 'score': 3.5, 'reports': 4},
            'academic_block_b': {'name': 'Academic Block B', 'score': 4.3, 'reports': 1}
        }
        self.safety_scores = campus_locations
    
    def add_incident(self, incident_data):
        incident_data['id'] = f'INC{len(self.incidents) + 1:04d}'
        incident_data['timestamp'] = datetime.now().isoformat()
        incident_data['status'] = 'reported'
        self.incidents.append(incident_data)
        return incident_data['id']
    
    def add_emergency(self, emergency_data):
        emergency_data['id'] = f'EMG{len(self.emergencies) + 1:04d}'
        emergency_data['timestamp'] = datetime.now().isoformat()
        emergency_data['status'] = 'active'
        self.emergencies.append(emergency_data)
        return emergency_data['id']
    
    def get_risk_heatmap_data(self):
        heatmap_data = []
        for location_id, data in self.safety_scores.items():
            risk_level = max(1, min(10, int((5 - data['score']) * 2)))
            heatmap_data.append({
                'location': location_id,
                'name': data['name'],
                'risk_level': risk_level,
                'score': data['score'],
                'reports': data['reports']
            })
        return heatmap_data

# Initialize database
db = SafetyDatabase()

# Your existing routes (keep all of them exactly as they are)
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    user_data = db.users.get('user123', {
        'name': 'User',
        'id': 'STU000000',
        'email': 'user@campus.edu',
        'phone': '+91-0000000000',
        'emergency_contacts': [],
        'medical_info': 'None',
        'battery_level': 85
    })
    return render_template('dashboard.html', user=user_data)

@app.route('/emergency')
def emergency():
    return render_template('emergency.html')

@app.route('/report', methods=['GET', 'POST'])
def report_incident():
    if request.method == 'POST':
        data = request.json
        incident_id = db.add_incident(data)
        return jsonify({'status': 'success', 'incident_id': incident_id})
    return render_template('report.html', locations=db.safety_scores)

@app.route('/safety-map')
def safety_map():
    heatmap_data = db.get_risk_heatmap_data()
    return render_template('safety_map.html', heatmap_data=heatmap_data, locations=db.safety_scores)

@app.route('/admin')
def admin_dashboard():
    active_emergencies = [e for e in db.emergencies if e.get('status') == 'active']
    recent_incidents = db.incidents[-5:]
    return render_template('admin.html', 
                         emergencies=active_emergencies,
                         incidents=recent_incidents,
                         patrols=db.patrols,
                         stats={
                             'total_incidents': len(db.incidents),
                             'active_emergencies': len(active_emergencies),
                             'avg_response_time': '45s',
                             'coverage': '100%'
                         })

@app.route('/profile')
def profile():
    user_data = db.users.get('user123', {
        'name': 'User',
        'id': 'STU000000',
        'email': 'user@campus.edu',
        'phone': '+91-0000000000',
        'emergency_contacts': [],
        'medical_info': 'None',
        'battery_level': 85
    })
    return render_template('profile.html', user=user_data)

@app.route('/shop')
def shop():
    # Add products data here or import from your existing code
    products = [
        {
            'id': 1,
            'name': 'Smart Safety Bracelet',
            'description': 'Waterproof bracelet with SOS button and GPS tracking',
            'price': 1299,
            'category': 'wearables',
            'features': ['SOS Button', 'GPS Tracking', 'Waterproof', '30-day battery'],
            'icon': 'heartbeat'
        },
        # ... add other products
    ]
    return render_template('shop.html', products=products)

@app.route('/safewalk')
def safewalk():
    return render_template('safewalk.html')

# API Routes (keep all your existing API routes)
@app.route('/api/trigger-emergency', methods=['POST'])
def trigger_emergency():
    data = request.json
    emergency_data = {
        'user_id': data.get('user_id', 'user123'),
        'user_name': db.users.get('user123', {}).get('name', 'User'),
        'location': data.get('location', {'lat': 28.6129, 'lng': 77.2295}),
        'type': data.get('type', 'emergency_sos'),
        'source': data.get('source', 'manual'),
        'battery_level': data.get('battery_level', 85)
    }
    
    emergency_id = db.add_emergency(emergency_data)
    nearby_devices = random.randint(2, 8)
    
    return jsonify({
        'status': 'success', 
        'emergency_id': emergency_id,
        'nearby_devices': nearby_devices,
        'response_time_estimate': '45 seconds'
    })

# ... include ALL your other API routes exactly as they are

# Health check endpoint for Render
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'service': 'Phoenix Safety App',
        'timestamp': datetime.now().isoformat()
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))  # Render uses port 10000
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)