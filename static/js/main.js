// Phoenix Safety App - Continuous Microphone Listening
class PhoenixSafetyApp {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.microphoneAccess = false;
        this.continuousListening = false;
        this.emergencyKeywords = ['help', 'emergency', 'sos', 'save me', 'danger', 'help me', 'security'];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initConnectionMonitoring();
        console.log('Phoenix Safety App initialized');
        
        // Request microphone permission and start continuous listening
        this.requestMicrophonePermission().then(access => {
            if (access) {
                this.startContinuousListening();
            }
        });
    }

    setupEventListeners() {
        // Voice button listener
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('click', () => {
                this.toggleContinuousListening();
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
                this.startSingleVoiceCommand();
            });
        }

        const voiceEmergencyBtn = document.getElementById('voiceEmergency');
        if (voiceEmergencyBtn) {
            voiceEmergencyBtn.addEventListener('click', () => {
                this.startSingleVoiceCommand();
            });
        }

        // Enable microphone button
        const enableMicBtn = document.getElementById('enableMicrophone');
        if (enableMicBtn) {
            enableMicBtn.addEventListener('click', () => {
                this.requestMicrophonePermission().then(access => {
                    if (access) {
                        this.startContinuousListening();
                    }
                });
            });
        }

        // Keep microphone alive by preventing page sleep
        this.setupWakeLock();
    }

    async setupWakeLock() {
        // Try to prevent the screen from sleeping (where supported)
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock was released');
                });
            } catch (err) {
                console.log('Wake Lock not supported:', err);
            }
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
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false 
            });
            
            // Keep the stream for continuous listening
            this.microphoneStream = stream;
            this.microphoneAccess = true;
            
            this.showMicrophoneMessage('Microphone access granted ✅ Continuous listening enabled', 'success');
            this.updateMicrophoneStatus();
            
            return true;
            
        } catch (error) {
            console.log('Microphone permission denied:', error);
            this.microphoneAccess = false;
            this.updateMicrophoneStatus();
            
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
            
            // Enable continuous listening
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.showVoiceFeedback('🎤 Continuous listening active...');
                this.updateListeningStatus(true);
                console.log('Continuous voice recognition started');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    console.log('Voice command detected:', finalTranscript);
                    this.processVoiceCommand(finalTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.log('Speech recognition error:', event.error);
                
                if (event.error === 'not-allowed') {
                    this.showVoiceFeedback('❌ Microphone access denied');
                    this.microphoneAccess = false;
                    this.stopContinuousListening();
                } else if (event.error === 'audio-capture') {
                    this.showVoiceFeedback('❌ No microphone found');
                } else if (event.error === 'network') {
                    this.showVoiceFeedback('🌐 Network error - reconnecting...');
                    // Auto-restart after network error
                    setTimeout(() => {
                        if (this.continuousListening) {
                            this.startRecognition();
                        }
                    }, 2000);
                } else {
                    this.showVoiceFeedback('⚠️ Listening error - reconnecting...');
                    // Auto-restart after other errors
                    setTimeout(() => {
                        if (this.continuousListening) {
                            this.startRecognition();
                        }
                    }, 1000);
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateListeningStatus(false);
                
                // Auto-restart if continuous listening is enabled
                if (this.continuousListening) {
                    console.log('Voice recognition ended, restarting...');
                    setTimeout(() => {
                        this.startRecognition();
                    }, 500);
                }
            };
        } catch (error) {
            console.log('Error initializing speech recognition:', error);
            this.showVoiceFeedback('❌ Voice commands not available');
        }
    }

    startRecognition() {
        if (!this.recognition || !this.continuousListening) return;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.log('Error starting recognition:', error);
            // Retry after delay
            setTimeout(() => {
                if (this.continuousListening) {
                    this.startRecognition();
                }
            }, 1000);
        }
    }

    startContinuousListening() {
        if (!this.microphoneAccess) {
            this.showVoiceFeedback('🎤 Please allow microphone access first');
            this.requestMicrophonePermission().then(access => {
                if (access) {
                    this.continuousListening = true;
                    this.initVoiceRecognition();
                    this.startRecognition();
                }
            });
            return;
        }

        this.continuousListening = true;
        this.initVoiceRecognition();
        this.startRecognition();
        
        this.showVoiceFeedback('🔴 Continuous listening ACTIVATED');
        this.updateContinuousListeningStatus(true);
    }

    stopContinuousListening() {
        this.continuousListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        this.showVoiceFeedback('🟢 Continuous listening PAUSED');
        this.updateContinuousListeningStatus(false);
    }

    toggleContinuousListening() {
        if (this.continuousListening) {
            this.stopContinuousListening();
        } else {
            this.startContinuousListening();
        }
    }

    startSingleVoiceCommand() {
        if (!this.microphoneAccess) {
            this.showVoiceFeedback('🎤 Please allow microphone access first');
            this.requestMicrophonePermission();
            return;
        }

        // Temporarily stop continuous listening for single command
        const wasContinuous = this.continuousListening;
        if (wasContinuous) {
            this.stopContinuousListening();
        }

        // Create a temporary recognition instance for single command
        const tempRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        tempRecognition.continuous = false;
        tempRecognition.interimResults = false;
        tempRecognition.lang = 'en-US';

        tempRecognition.onstart = () => {
            this.showVoiceFeedback('🎤 Listening for command...');
        };

        tempRecognition.onresult = (event) => {
            const command = event.results[0][0].transcript;
            this.processVoiceCommand(command);
            
            // Restart continuous listening if it was enabled
            if (wasContinuous) {
                setTimeout(() => {
                    this.startContinuousListening();
                }, 1000);
            }
        };

        tempRecognition.onerror = (event) => {
            this.showVoiceFeedback('❌ Command failed');
            // Restart continuous listening if it was enabled
            if (wasContinuous) {
                setTimeout(() => {
                    this.startContinuousListening();
                }, 1000);
            }
        };

        tempRecognition.onend = () => {
            // Restart continuous listening if it was enabled
            if (wasContinuous) {
                setTimeout(() => {
                    this.startContinuousListening();
                }, 500);
            }
        };

        try {
            tempRecognition.start();
        } catch (error) {
            console.log('Error starting single command:', error);
            this.showVoiceFeedback('❌ Failed to start listening');
        }
    }

    updateContinuousListeningStatus(isActive) {
        const voiceButton = document.getElementById('voiceButton');
        const statusElement = document.getElementById('microphoneStatus');
        
        if (isActive) {
            if (voiceButton) {
                voiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                voiceButton.classList.add('bg-red-500');
                voiceButton.classList.remove('bg-green-500');
            }
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-microphone mr-1"></i>Listening';
                statusElement.className = 'text-xs bg-green-500 text-white px-2 py-1 rounded animate-pulse';
            }
        } else {
            if (voiceButton) {
                voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceButton.classList.add('bg-green-500');
                voiceButton.classList.remove('bg-red-500');
            }
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-microphone mr-1"></i>Ready';
                statusElement.className = 'text-xs bg-blue-500 text-white px-2 py-1 rounded';
            }
        }
    }

    updateListeningStatus(isListening) {
        const statusElement = document.getElementById('microphoneStatus');
        if (statusElement) {
            if (isListening) {
                statusElement.classList.add('animate-pulse');
            } else {
                statusElement.classList.remove('animate-pulse');
            }
        }
    }

    updateMicrophoneStatus() {
        const statusElement = document.getElementById('microphoneStatus');
        const statusText = document.getElementById('microphoneStatusText');
        const helpText = document.getElementById('microphoneHelpText');
        const enableButton = document.getElementById('enableMicrophone');
        const statusCard = document.getElementById('microphoneStatusCard');

        if (this.microphoneAccess) {
            if (statusElement) {
                if (this.continuousListening) {
                    statusElement.innerHTML = '<i class="fas fa-microphone mr-1"></i>Listening';
                    statusElement.className = 'text-xs bg-green-500 text-white px-2 py-1 rounded animate-pulse';
                } else {
                    statusElement.innerHTML = '<i class="fas fa-microphone mr-1"></i>Ready';
                    statusElement.className = 'text-xs bg-blue-500 text-white px-2 py-1 rounded';
                }
            }
            if (statusText) statusText.textContent = 'Microphone access granted';
            if (helpText) helpText.textContent = this.continuousListening ? 'Continuous listening active' : 'Click microphone to start listening';
            if (statusCard) {
                statusCard.className = 'mb-4 p-3 bg-green-50 rounded-lg border border-green-200';
            }
            if (enableButton) enableButton.style.display = 'none';
        } else {
            if (statusElement) {
                statusElement.innerHTML = '<i class="fas fa-microphone-slash mr-1"></i>No Mic';
                statusElement.className = 'text-xs bg-red-500 text-white px-2 py-1 rounded';
            }
            if (statusText) statusText.textContent = 'Microphone access required';
            if (helpText) helpText.textContent = 'Enable microphone for voice commands';
            if (statusCard) {
                statusCard.className = 'mb-4 p-3 bg-red-50 rounded-lg border border-red-200';
            }
            if (enableButton) enableButton.style.display = 'block';
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

    // ... (keep all your existing methods like triggerEmergencySOS, navigateToAction, etc.)

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

    showVoiceFeedback(message) {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.innerHTML = message;
            feedback.classList.remove('hidden');
            
            // Auto-hide after 3 seconds for non-critical messages
            if (!message.includes('🚨') && !message.includes('ACTIVATED') && !message.includes('PAUSED')) {
                setTimeout(() => {
                    this.hideVoiceFeedback();
                }, 3000);
            }
        }
    }

    hideVoiceFeedback() {
        const feedback = document.getElementById('voiceFeedback');
        if (feedback) {
            feedback.classList.add('hidden');
        }
    }

    // Clean up when page is closed
    cleanup() {
        this.continuousListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop());
        }
        if (this.wakeLock) {
            this.wakeLock.release();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.phoenixApp = new PhoenixSafetyApp();
    
    // Clean up when page is unloaded
    window.addEventListener('beforeunload', function() {
        if (window.phoenixApp) {
            window.phoenixApp.cleanup();
        }
    });

    // Keep the app alive by preventing sleep (where supported)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && window.phoenixApp && window.phoenixApp.continuousListening) {
            // Page became visible again, ensure continuous listening restarts
            setTimeout(() => {
                if (window.phoenixApp.continuousListening && !window.phoenixApp.isListening) {
                    window.phoenixApp.startRecognition();
                }
            }, 1000);
        }
    });

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
