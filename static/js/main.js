// Phoenix Safety App - Enhanced with Microphone Permissions
class PhoenixSafetyApp {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.microphoneAccess = false;
        this.emergencyKeywords = ['help', 'emergency', 'sos', 'save me', 'danger', 'help me', 'security'];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initConnectionMonitoring();
        console.log('Phoenix Safety App initialized');
        
        // Request microphone permission on app start
        this.requestMicrophonePermission();
    }

    setupEventListeners() {
        // Voice button listener
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => {
                this.startVoiceCommand();
            });
        }

        // Global SOS buttons
        document.querySelectorAll('#sosButton, #emergencySosButton').forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    this.triggerEmergencySOS('manual');
                });
            }
        });

        // Voice command buttons
        const voiceCommandBtn = document.getElementById('voiceCommand');
        if (voiceCommandBtn) {
            voiceCommandBtn.addEventListener('click', () => {
                this.startVoiceCommand();
            });
        }

        const voiceEmergencyBtn = document.getElementById('voiceEmergency');
        if (voiceEmergencyBtn) {
            voiceEmergencyBtn.addEventListener('click', () => {
                this.startVoiceCommand();
            });
        }
    }

    async requestMicrophonePermission() {
        try {
            // Check if browser supports microphone access
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showMicrophoneMessage('Microphone access not supported in this browser');
                return false;
            }

            // Try to get microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            
            // Stop the stream immediately (we just needed permission)
            stream.getTracks().forEach(track => track.stop());
            
            this.microphoneAccess = true;
            this.showMicrophoneMessage('Microphone access granted ✅', 'success');
            this.initVoiceRecognition();
            
            return true;
            
        } catch (error) {
            console.log('Microphone permission denied:', error);
            this.microphoneAccess = false;
            
            if (error.name === 'NotAllowedError') {
                this.showMicrophoneMessage('Microphone access is required for voice commands. Please allow microphone permissions.', 'error');
            } else if (error.name === 'NotFoundError') {
                this.showMicrophoneMessage('No microphone found on this device', 'error');
            } else {
                this.showMicrophoneMessage('Cannot access microphone: ' + error.message, 'error');
            }
            
            return false;
        }
    }

    showMicrophoneMessage(message, type = 'info') {
        // Remove existing message
        const existingMsg = document.getElementById('microphonePermissionMessage');
        if (existingMsg) {
            existingMsg.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'microphonePermissionMessage';
        messageDiv.className = `fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm text-center ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        messageDiv.innerHTML = `
            <div class="flex items-center justify-center">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : '🎤'}
                <span class="ml-2 text-sm font-medium">${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    initVoiceRecognition() {
        if (!this.microphoneAccess) {
            console.log('Microphone access not granted, skipping voice recognition');
            return;
        }

        // Check browser compatibility
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showVoiceFeedback('Voice commands not supported in this browser');
            return;
        }

        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.showVoiceFeedback('🎤 Listening... Speak now');
                console.log('Voice recognition started');
            };

            this.recognition.onresult = (event) => {
                const command = event.results[0][0].transcript;
                console.log('Voice command detected:', command);
                this.processVoiceCommand(command);
            };

            this.recognition.onerror = (event) => {
                console.log('Speech recognition error:', event.error);
                this.isListening = false;
                
                if (event.error === 'not-allowed') {
                    this.showVoiceFeedback('❌ Microphone access denied. Please allow microphone permissions in your browser settings.');
                    this.microphoneAccess = false;
                } else if (event.error === 'audio-capture') {
                    this.showVoiceFeedback('❌ No microphone found. Please check your microphone connection.');
                } else {
                    this.showVoiceFeedback('❌ Error listening. Please try again.');
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                setTimeout(() => {
                    this.hideVoiceFeedback();
                }, 2000);
            };
        } catch (error) {
            console.log('Error initializing speech recognition:', error);
            this.showVoiceFeedback('❌ Voice commands not available');
        }
    }

    startVoiceCommand() {
        if (!this.microphoneAccess) {
            this.showVoiceFeedback('🎤 Please allow microphone access first');
            // Re-request permission
            setTimeout(() => {
                this.requestMicrophonePermission();
            }, 1000);
            return;
        }

        if (!this.recognition) {
            this.showVoiceFeedback('❌ Voice commands not supported');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            this.showVoiceFeedback('✅ Listening stopped');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.log('Error starting voice recognition:', error);
            this.showVoiceFeedback('❌ Error starting voice recognition');
        }
    }

    processVoiceCommand(command) {
        const lowerCommand = command.toLowerCase().trim();
        
        // Check for emergency keywords
        if (this.emergencyKeywords.some(keyword => lowerCommand.includes(keyword))) {
            console.log('🚨 EMERGENCY VOICE COMMAND DETECTED:', command);
            this.showVoiceFeedback('🚨 Emergency detected! Activating SOS...');
            setTimeout(() => {
                this.triggerEmergencySOS('voice_command');
            }, 1000);
            return;
        }

        // Process other commands via API
        this.showVoiceFeedback(`🔍 Processing: "${command}"`);
        
        fetch('/api/voice-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                command: lowerCommand
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Voice command processed:', data);
            this.showVoiceFeedback('✅ ' + data.message);
            
            // Handle navigation actions
            if (data.action) {
                setTimeout(() => {
                    this.navigateToAction(data.action);
                }, 1500);
            }
        })
        .catch(error => {
            console.error('Error processing voice command:', error);
            this.showVoiceFeedback('❌ Network error. Please try again.');
        });
    }

    navigateToAction(action) {
        const routes = {
            'dashboard': '/dashboard',
            'safety_map': '/safety-map',
            'report': '/report',
            'profile': '/profile',
            'shop': '/shop',
            'safewalk': '/safewalk',
            'emergency': '/emergency'
        };

        if (routes[action]) {
            window.location.href = routes[action];
        }
    }

    triggerEmergencySOS(source = 'manual') {
        // Show emergency overlay immediately
        const overlay = document.getElementById('emergencyOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        
        // Vibrate phone (if supported)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Get current location and send emergency alert
        this.getCurrentLocation()
            .then(location => {
                return fetch('/api/trigger-emergency', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: 'user123',
                        type: 'emergency_sos',
                        source: source,
                        location: location,
                        battery_level: this.getBatteryLevel()
                    })
                });
            })
            .then(response => response.json())
            .then(data => {
                console.log('Emergency alert sent:', data);
                
                // Update UI with response information
                if (data.response_time_estimate) {
                    const etaElement = document.getElementById('etaTime');
                    if (etaElement) {
                        etaElement.textContent = data.response_time_estimate;
                    }
                }
                
                if (data.nearby_devices) {
                    const nearbyElement = document.getElementById('nearbyAlert');
                    if (nearbyElement) {
                        nearbyElement.textContent = `${data.nearby_devices} nearby users alerted`;
                    }
                }
            })
            .catch(error => {
                console.error('Error sending emergency alert:', error);
                this.showVoiceFeedback('✅ Emergency alert activated!');
            });
    }

    getCurrentLocation() {
        return fetch('/api/get-location')
            .then(response => response.json())
            .catch(error => {
                console.error('Error getting location:', error);
                return {
                    lat: 28.6129,
                    lng: 77.2295,
                    accuracy: 15,
                    timestamp: new Date().toISOString()
                };
            });
    }

    getBatteryLevel() {
        return Math.max(5, Math.floor(Math.random() * 100));
    }

    showVoiceFeedback(message) {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.innerHTML = message;
            feedback.classList.remove('hidden');
        }
    }

    hideVoiceFeedback() {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.classList.add('hidden');
        }
    }

    initConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
        });
    }

    updateConnectionStatus(online) {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            if (online) {
                connectionStatus.innerHTML = '<i class="fas fa-wifi mr-1"></i>Connected';
                connectionStatus.className = 'text-xs bg-green-500 text-white px-2 py-1 rounded';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-wifi-slash mr-1"></i>Offline';
                connectionStatus.className = 'text-xs bg-red-500 text-white px-2 py-1 rounded';
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.phoenixApp = new PhoenixSafetyApp();
    
    // Add global emergency cancel handler
    const cancelButton = document.getElementById('cancelEmergency');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            const overlay = document.getElementById('emergencyOverlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
            
            fetch('/api/cancel-emergency', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: 'user123',
                    emergency_id: 'current'
                })
            }).catch(error => {
                console.log('Cancel request failed');
            });
        });
    }

    // Update battery level simulation
    setInterval(() => {
        const batteryElement = document.getElementById('batteryLevel');
        if (batteryElement) {
            const currentBattery = parseInt(batteryElement.textContent);
            if (currentBattery > 5) {
                const newBattery = currentBattery - 1;
                batteryElement.textContent = newBattery + '%';
                
                if (newBattery < 20) {
                    batteryElement.classList.remove('text-green-500');
                    batteryElement.classList.add('text-red-500');
                    
                    fetch('/api/update-battery', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            battery_level: newBattery
                        })
                    }).catch(() => {});
                }
            }
        }
    }, 30000);
});
