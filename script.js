// Application state
let currentView = 'queue'; // 'queue' or 'assessment'
let patients = [];
let lastId = 0;

// Load patients from server
async function loadPatients() {
    try {
        const response = await fetch('/api/patients');
        if (response.ok) {
            const data = await response.json();
            patients = data.patients || [];
            lastId = data.lastId || 0;
            updateQueueStats();
            renderPatientQueue();
        } else {
            console.error('Failed to load patients:', await response.text());
            // Fallback to empty array if server is not available
            patients = [];
            lastId = 0;
            updateQueueStats();
            renderPatientQueue();
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        // Fallback to empty array if server is not available
        patients = [];
        lastId = 0;
        updateQueueStats();
        renderPatientQueue();
    }
}

let assessmentData = {
    vitalsStable: null,
    painLevel: null,
    chestPain: null,
    breathingDifficulty: null,
    consciousness: null,
    bleeding: null,
    onset: null,
    age: null
};

let currentQuestion = 0;
let showResult = false;
let patientESI = null;

// Assessment questions
const questions = [
    {
        id: 'vitalsStable',
        question: 'Are your vital signs stable? (No severe distress, normal breathing rate, normal pulse)',
        type: 'yes_no'
    },
    {
        id: 'painLevel',
        question: 'On a scale of 0-10, what is your current pain level?',
        type: 'scale',
        options: Array.from({length: 11}, (_, i) => i)
    },
    {
        id: 'chestPain',
        question: 'Are you experiencing chest pain?',
        type: 'yes_no'
    },
    {
        id: 'breathingDifficulty',
        question: 'Are you having difficulty breathing?',
        type: 'multiple',
        options: ['none', 'mild', 'moderate', 'severe']
    },
    {
        id: 'consciousness',
        question: 'How would you describe your current mental state?',
        type: 'multiple',
        options: ['alert', 'confused', 'drowsy', 'unresponsive']
    },
    {
        id: 'bleeding',
        question: 'Are you experiencing any bleeding?',
        type: 'yes_no'
    },
    {
        id: 'onset',
        question: 'How quickly did your symptoms start?',
        type: 'multiple',
        options: ['sudden', 'gradual', 'chronic']
    },
    {
        id: 'age',
        question: 'What is your age?',
        type: 'number'
    }
];

// ESI Calculation Logic
function calculateESI(data) {
    // ESI 1: Immediate life-threatening
    if (data.vitalsStable === 'no' || data.consciousness === 'unresponsive' || 
        (data.chestPain === 'yes' && data.onset === 'sudden')) {
        return 1;
    }
    
    // ESI 2: High risk, shouldn't wait
    if (data.painLevel >= 8 || data.breathingDifficulty === 'severe' || 
        (data.bleeding === 'yes' && data.onset === 'sudden')) {
        return 2;
    }
    
    // ESI 3: Moderate risk
    if (data.painLevel >= 5 || data.breathingDifficulty === 'moderate' || 
        data.chestPain === 'yes' || data.age >= 65) {
        return 3;
    }
    
    // ESI 4: Lower risk
    if (data.painLevel >= 3 || data.bleeding === 'yes') {
        return 4;
    }
    
    // ESI 5: Lowest risk
    return 5;
}

// Utility functions
function getESIColor(esi) {
    const colors = {
        1: 'esi-1',
        2: 'esi-2', 
        3: 'esi-3',
        4: 'esi-4',
        5: 'esi-5'
    };
    return colors[esi] || 'bg-gray-500 text-white';
}

function getESILabel(esi) {
    const labels = {
        1: 'Immediate',
        2: 'Emergent',
        3: 'Urgent', 
        4: 'Less Urgent',
        5: 'Non-Urgent'
    };
    return labels[esi] || 'Unknown';
}

function getStatusIcon(status) {
    switch (status) {
        case 'Waiting': 
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
        case 'In Triage': 
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>`;
        case 'Being Seen': 
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
        default: 
            return `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>`;
    }
}

// View management
function showQueueView() {
    document.getElementById('queueView').style.display = 'block';
    document.getElementById('assessmentView').style.display = 'none';
    currentView = 'queue';
    updateQueueStats();
    renderPatientQueue();
}

function showAssessmentView() {
    document.getElementById('queueView').style.display = 'none';
    document.getElementById('assessmentView').style.display = 'block';
    currentView = 'assessment';
    resetAssessment();
    renderCurrentQuestion();
}

// Queue management
function updateQueueStats() {
    document.getElementById('totalPatients').textContent = patients.length;
    const avgWaitTime = Math.round(patients.reduce((acc, p) => acc + p.waitTime, 0) / patients.length);
    document.getElementById('avgWaitTime').textContent = `${avgWaitTime}m`;
    document.getElementById('criticalCases').textContent = patients.filter(p => p.esi <= 2).length;
}

function renderPatientQueue() {
    const queueContainer = document.getElementById('patientQueue');
    const sortedPatients = [...patients].sort((a, b) => a.esi - b.esi);
    
    queueContainer.innerHTML = sortedPatients.map((patient, index) => `
        <div class="p-4 hover:bg-gray-50 transition-colors fade-in">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="text-2xl font-bold text-gray-400 bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center">
                        ${index + 1}
                    </div>
                    <div>
                        <div class="flex items-center space-x-3 mb-1">
                            <span class="font-semibold text-lg">${patient.id}</span>
                            <span class="px-3 py-1 rounded-full text-sm font-medium ${getESIColor(patient.esi)}">
                                ESI ${patient.esi} - ${getESILabel(patient.esi)}
                            </span>
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="font-medium">${patient.chief_complaint}</span> • Arrived: ${patient.arrivalTime}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="flex items-center space-x-2 mb-1">
                        ${getStatusIcon(patient.status)}
                        <span class="font-medium text-gray-700">${patient.status}</span>
                    </div>
                    ${patient.waitTime > 0 ? `
                        <div class="text-sm text-gray-500">
                            Est. wait: ${patient.waitTime}m
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Assessment management
function resetAssessment() {
    assessmentData = {
        vitalsStable: null,
        painLevel: null,
        chestPain: null,
        breathingDifficulty: null,
        consciousness: null,
        bleeding: null,
        onset: null,
        age: null
    };
    currentQuestion = 0;
    showResult = false;
    patientESI = null;
    document.getElementById('assessmentQuestions').style.display = 'block';
    document.getElementById('resultsScreen').style.display = 'none';
}

function renderCurrentQuestion() {
    const question = questions[currentQuestion];
    document.getElementById('questionText').textContent = question.question;
    document.getElementById('questionProgress').textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
    
    // Update progress bar
    const progressPercentage = ((currentQuestion + 1) / questions.length) * 100;
    document.getElementById('progressBar').style.width = `${progressPercentage}%`;
    
    // Render answer options
    const answerContainer = document.getElementById('answerOptions');
    
    if (question.type === 'yes_no') {
        answerContainer.innerHTML = `
            <div class="space-y-4">
                <button onclick="handleAnswerSelect('yes')" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-xl font-semibold text-gray-700 hover:text-green-700">
                    <span class="text-green-600 mr-3">✓</span> Yes
                </button>
                <button onclick="handleAnswerSelect('no')" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-xl font-semibold text-gray-700 hover:text-red-700">
                    <span class="text-red-600 mr-3">✗</span> No
                </button>
            </div>
        `;
    } else if (question.type === 'scale') {
        answerContainer.innerHTML = `
            <div>
                <div class="flex justify-between text-sm text-gray-500 mb-4">
                    <span class="font-medium">No Pain (0)</span>
                    <span class="font-medium">Worst Possible Pain (10)</span>
                </div>
                <div class="grid grid-cols-6 gap-3">
                    ${question.options.map(option => `
                        <button onclick="handleAnswerSelect(${option})" class="p-5 border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center font-bold text-xl text-gray-700 hover:text-blue-700">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (question.type === 'multiple') {
        answerContainer.innerHTML = `
            <div class="space-y-4">
                ${question.options.map(option => `
                    <button onclick="handleAnswerSelect('${option}')" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all capitalize text-xl font-semibold text-gray-700 hover:text-blue-700">
                        ${option}
                    </button>
                `).join('')}
            </div>
        `;
    } else if (question.type === 'number') {
        answerContainer.innerHTML = `
            <div>
                <input
                    type="number"
                    min="0"
                    max="120"
                    class="w-full p-6 border-3 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-xl font-medium text-center"
                    placeholder="Enter your age (e.g., 45)"
                    onkeypress="handleAgeInput(event)"
                    onchange="handleAgeChange(event)"
                />
            </div>
        `;
    }
}

function handleAnswerSelect(value) {
    const currentQ = questions[currentQuestion];
    assessmentData[currentQ.id] = value;

    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        renderCurrentQuestion();
    } else {
        // Calculate ESI and show result
        const esi = calculateESI(assessmentData);
        patientESI = esi;
        showResult = true;
        showResultsScreen();
    }
}

function handleAgeInput(event) {
    if (event.key === 'Enter' && event.target.value) {
        handleAnswerSelect(parseInt(event.target.value));
    }
}

function handleAgeChange(event) {
    if (event.target.value && event.target.value >= 0) {
        setTimeout(() => handleAnswerSelect(parseInt(event.target.value)), 1000);
    }
}

function showResultsScreen() {
    document.getElementById('assessmentQuestions').style.display = 'none';
    document.getElementById('resultsScreen').style.display = 'block';
    
    // Update priority level display
    const priorityElement = document.getElementById('priorityLevel');
    priorityElement.textContent = `Priority Level ${patientESI} - ${getESILabel(patientESI)}`;
    priorityElement.className = `inline-flex items-center px-10 py-5 rounded-2xl text-2xl font-bold ${getESIColor(patientESI)} shadow-xl`;
    
    // Update priority message
    const messageElement = document.getElementById('priorityMessage');
    if (patientESI <= 2) {
        messageElement.textContent = '🚨 HIGH PRIORITY: You will be seen immediately. Please proceed to the triage desk right now for immediate assessment.';
    } else if (patientESI === 3) {
        messageElement.textContent = '⚠️ URGENT CARE: You will be prioritized in our queue. Your estimated wait time is 30-60 minutes. Please remain in the waiting area.';
    } else {
        messageElement.textContent = 'ℹ️ STANDARD CARE: You will be added to our queue in order of arrival. Please have a seat in the waiting area and we\'ll call you when ready.';
    }
}

async function addPatientToQueue() {
    const newPatient = {
        esi: patientESI,
        status: 'Waiting',
        waitTime: Math.round(Math.random() * 60 + 30),
        arrivalTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        chief_complaint: 'Self-assessed symptoms'
    };
    
    try {
        const response = await fetch('/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPatient)
        });
        
        if (response.ok) {
            const result = await response.json();
            // Reload patients from server
            await loadPatients();
            // Reset form and return to queue
            showQueueView();
        } else {
            console.error('Failed to add patient:', await response.text());
            alert('Failed to add patient to queue. Please try again.');
        }
    } catch (error) {
        console.error('Error adding patient:', error);
        alert('Failed to add patient to queue. Please check your connection and try again.');
    }
}

function startAssessment() {
    showAssessmentView();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data from server
    loadPatients();
    
    // Button event listeners
    document.getElementById('startAssessmentBtn').addEventListener('click', startAssessment);
    document.getElementById('backToQueueBtn').addEventListener('click', showQueueView);
    document.getElementById('addToQueueBtn').addEventListener('click', addPatientToQueue);
});
