from flask import Flask, render_template, request, jsonify, session, send_from_directory
from datetime import datetime
import json
import random
import os

app = Flask(__name__, 
    static_folder='static',
    static_url_path='/static'
)

# Vercel-specific configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'vercel-secret-key-change-in-production'),
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PREFERRED_URL_SCHEME='https'
)

# Add explicit static file routes for Vercel
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/static/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('static/images', filename)

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename)

@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('static/css', filename)

# Your existing database class
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
        self.products = [
            {
                'id': 1,
                'name': 'Smart Safety Bracelet',
                'description': 'Waterproof bracelet with SOS button and GPS tracking',
                'price': 1299,
                'image': '/static/images/bracelet.jpg',
                'category': 'wearables',
                'features': ['SOS Button', 'GPS Tracking', 'Waterproof', '30-day battery'],
                'icon': 'heartbeat'
            },
            {
                'id': 2,
                'name': 'Self-Defense Keychain',
                'description': 'Compact personal alarm with 130dB siren and strobe light',
                'price': 599,
                'image': '/static/images/keychain.jpg',
                'category': 'defense',
                'features': ['130dB Alarm', 'Strobe Light', 'Keychain Design', 'Easy to Carry'],
                'icon': 'shield-alt'
            },
            {
                'id': 3,
                'name': 'Safety Pendant',
                'description': 'Elegant necklace with hidden SOS button and fall detection',
                'price': 1599,
                'image': '/static/images/pendant.jpg',
                'category': 'wearables',
                'features': ['Hidden SOS', 'Fall Detection', 'Elegant Design', 'GPS Enabled'],
                'icon': 'gem'
            },
            {
                'id': 4,
                'name': 'Pepper Spray',
                'description': 'Legal self-defense spray with safety lock and quick release',
                'price': 399,
                'image': '/static/images/pepper-spray.jpg',
                'category': 'defense',
                'features': ['Legal Formula', 'Safety Lock', 'Quick Release', 'Compact Size'],
                'icon': 'spray-can'
            },
            {
                'id': 5,
                'name': 'Phoenix Hoodie',
                'description': 'Comfortable hoodie with safety features and reflective strips',
                'price': 1499,
                'image': '/static/images/hoodie.jpg',
                'category': 'apparel',
                'features': ['Reflective Strips', 'Comfortable', 'Safety Features', 'Premium Quality'],
                'icon': 'tshirt'
            },
            {
                'id': 6,
                'name': 'Personal Alarm',
                'description': 'Loud personal safety alarm with pin activation',
                'price': 299,
                'image': '/static/images/alarm.jpg',
                'category': 'defense',
                'features': ['Loud Alarm', 'Pin Activation', 'Compact', 'Easy to Use'],
                'icon': 'bell'
            }
        ]
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

# Your existing routes (keep them exactly as they are)
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
    return render_template('shop.html', products=db.products)

@app.route('/safewalk')
def safewalk():
    return render_template('safewalk.html')

# Your existing API routes (keep them exactly as they are)
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

@app.route('/api/cancel-emergency', methods=['POST'])
def cancel_emergency():
    data = request.json
    # Your existing cancel emergency logic
    return jsonify({'status': 'success', 'message': 'Emergency cancelled'})

@app.route('/api/voice-command', methods=['POST'])
def process_voice_command():
    data = request.json
    command = data.get('command', '').lower()
    
    # Your existing voice command logic
    emergency_keywords = ['help', 'emergency', 'sos', 'save me', 'danger']
    
    if any(keyword in command for keyword in emergency_keywords):
        emergency_data = {
            'user_id': 'user123',
            'type': 'voice_emergency',
            'source': 'voice',
            'voice_command': command
        }
        emergency_id = db.add_emergency(emergency_data)
        return jsonify({
            'status': 'emergency_triggered',
            'action': 'emergency',
            'emergency_id': emergency_id,
            'message': 'Emergency alert activated via voice command!'
        })
    
    return jsonify({'status': 'command_processed', 'command': command})

@app.route('/api/report-incident', methods=['POST'])
def report_incident_api():
    data = request.json
    incident_id = db.add_incident(data)
    return jsonify({'status': 'success', 'incident_id': incident_id})

@app.route('/api/start-safewalk', methods=['POST'])
def start_safewalk():
    data = request.json
    safewalk_data = {
        'user_id': data.get('user_id', 'user123'),
        'start_location': data.get('start_location'),
        'end_location': data.get('end_location'),
        'start_time': datetime.now().isoformat(),
        'status': 'active',
        'safewalk_id': 'SW_' + str(random.randint(1000, 9999))
    }
    return jsonify({'status': 'success', 'safewalk_data': safewalk_data})

@app.route('/api/get-location')
def get_location():
    base_lat, base_lng = 28.6129, 77.2295
    location = {
        'lat': base_lat + (random.random() - 0.5) * 0.001,
        'lng': base_lng + (random.random() - 0.5) * 0.001,
        'accuracy': random.randint(5, 15),
        'timestamp': datetime.now().isoformat()
    }
    return jsonify(location)

@app.route('/api/update-battery', methods=['POST'])
def update_battery():
    data = request.json
    battery_level = data.get('battery_level', 85)
    return jsonify({'status': 'success', 'battery_level': battery_level})

# Health check endpoint
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy', 
        'service': 'Phoenix Safety App',
        'timestamp': datetime.now().isoformat(),
        'environment': 'Vercel'
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

# Test route to verify static files are working
@app.route('/test-images')
def test_images():
    """Test route to verify images are accessible"""
    images = [
        '/static/images/bracelet.jpg',
        '/static/images/keychain.jpg', 
        '/static/images/pendant.jpg',
        '/static/images/pepper-spray.jpg',
        '/static/images/hoodie.jpg',
        '/static/images/alarm.jpg'
    ]
    
    results = []
    for img_path in images:
        results.append({
            'path': img_path,
            'exists': os.path.exists(img_path.replace('/static/', 'static/'))
        })
    
    return jsonify({
        'static_folder': app.static_folder,
        'static_url_path': app.static_url_path,
        'image_test_results': results
    })

# This is important for Vercel - don't use app.run()
if __name__ == '__main__':
    app.run(debug=True)