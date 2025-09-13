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

// New ESI Calculation Algorithm - Based on 4 Core Questions
const calculateESI = (data) => {
    let esiScore = 5; // Start with lowest priority (ESI 5)

    // 1. PAIN LEVEL ASSESSMENT (Primary Factor)
    const painLevel = parseInt(data.pain_level) || 0;
    if (painLevel >= 9) {
        esiScore = 1; // Severe pain = Immediate
    } else if (painLevel >= 7) {
        esiScore = 2; // High pain = Emergent
    } else if (painLevel >= 5) {
        esiScore = Math.min(esiScore, 3); // Moderate pain = Urgent
    } else if (painLevel >= 3) {
        esiScore = Math.min(esiScore, 4); // Mild pain = Less urgent
    }

    // 2. SYMPTOM ONSET ASSESSMENT (Acute vs Chronic)
    if (data.symptom_onset === '0-4 hours') {
        // Acute onset - needs immediate evaluation
        if (painLevel >= 6) {
            esiScore = Math.min(esiScore, 1); // Acute severe pain
        } else if (painLevel >= 4) {
            esiScore = Math.min(esiScore, 2); // Acute moderate pain
        } else {
            esiScore = Math.min(esiScore, 3); // Any acute symptom
        }
    } else if (data.symptom_onset === '5-12 hours') {
        // Recent onset - still concerning
        if (painLevel >= 7) {
            esiScore = Math.min(esiScore, 2);
        } else if (painLevel >= 5) {
            esiScore = Math.min(esiScore, 3);
        }
    } else if (data.symptom_onset === '24 hours') {
        // Day-old symptoms - less urgent unless severe
        if (painLevel >= 8) {
            esiScore = Math.min(esiScore, 2);
        }
    } else if (data.symptom_onset === '1+ days') {
        // Chronic symptoms - lowest priority unless very severe
        if (painLevel >= 9) {
            esiScore = Math.min(esiScore, 2);
        } else if (painLevel < 5) {
            esiScore = 5; // Chronic low pain = lowest priority
        }
    }

    // 3. SYMPTOM PROGRESSION ASSESSMENT
    if (data.systom_progression === 'Worsened') {
        // Worsening symptoms increase urgency
        if (painLevel >= 6) {
            esiScore = Math.min(esiScore, 1); // Worsening + significant pain
        } else if (painLevel >= 4) {
            esiScore = Math.min(esiScore, 2); // Worsening + moderate pain
        } else {
            esiScore = Math.min(esiScore, 3); // Any worsening condition
        }
    } else if (data.systom_progression === 'Getting better') {
        // Improving symptoms can be less urgent
        if (painLevel < 6 && data.symptom_onset !== '0-4 hours') {
            esiScore = Math.max(esiScore, 4); // Lower priority if improving
        }
    } else if (data.systom_progression === 'No change') {
        // Stable symptoms - no adjustment needed
    }

    // 4. CONDITION KNOWLEDGE ASSESSMENT
    if (data.Condition_knowity === 'New condition') {
        // New conditions need evaluation
        if (painLevel >= 5) {
            esiScore = Math.min(esiScore, 2); // New condition + moderate pain
        } else if (painLevel >= 3) {
            esiScore = Math.min(esiScore, 3); // New condition + mild pain
        }
    } else if (data.Condition_knowity === 'Known condition') {
        // Known conditions may be less urgent if stable
        if (data.systom_progression === 'No change' && painLevel < 7) {
            esiScore = Math.max(esiScore, 4); // Known stable condition
        }
    }

    // CRITICAL COMBINATION RULES
    // Rule 1: Acute onset + worsening + high pain = Critical
    if (data.symptom_onset === '0-4 hours' &&
        data.systom_progression === 'Worsened' &&
        painLevel >= 7) {
        esiScore = 1;
    }

    // Rule 2: New condition + acute onset + worsening = High priority
    if (data.Condition_knowity === 'New condition' &&
        data.symptom_onset === '0-4 hours' &&
        data.systom_progression === 'Worsened') {
        esiScore = Math.min(esiScore, 2);
    }

    // Rule 3: Chronic improving condition = Lower priority
    if (data.symptom_onset === '1+ days' &&
        data.systom_progression === 'Getting better' &&
        data.Condition_knowity === 'Known condition' &&
        painLevel < 5) {
        esiScore = 5;
    }

    return Math.max(1, Math.min(5, esiScore)); // Ensure ESI is between 1-5
};

const questions = [
    {
        id: 'patient_info',
        questions: [
            {
                sub_id: 'name',
                sub_q: 'Full Name',
                type: 'string'
            },
            {
                sub_id: 'dob',
                sub_q: 'Date of Birth',
                type: 'date'
            },
            {
                sub_id: 'gender',
                sub_q: 'Gender',
                type: 'multiple',
                options: ['Female', 'Male', 'Other', 'Prefer Not to Say']
            },
            {
                sub_id: 'phone_no',
                sub_q: 'Phone No.',
                type: 'number'
            },
            {
                sub_id: 'emergency_name',
                sub_q: 'Emergency Contact Name',
                type: 'string'
            },
            {
                sub_id: 'emergency_phone',
                sub_q: 'Emergency Contact Phone',
                type: 'number'
            },
            {
                sub_id: 'emergency_relation',
                sub_q: 'Emergency Contact Relationship',
                type: 'multiple',
                options: ['Parent', 'Legal Guardian', 'Sibling']
            }
        ]
    },
    [
        {
            id: 'esi_questions',
            questions: [
                {
                    sub_id: 'symptom_onset',
                    sub_q: 'When did the symptoms start?',
                    type: 'multiple',
                    options: ['0-4 hours', '5-12 hours', '24 hours', '1+ days'],
                },
                {
                    sub_id: 'symptom_progression',
                    sub_q: 'How have your symptoms progressed?',
                    type: 'multiple',
                    options: ['Getting better', 'Worsened', 'No change'],
                },
                {
                    sub_id: 'pain_level',
                    sub_q: 'On a scale of 0-10, what is your current pain level?',
                    type: 'scale',
                    options: Array.from({ length: 11 }, (_, i) => i),
                },
                {
                    sub_id: 'condition_history',
                    sub_q: 'Is this a new condition or has it ever happened before?',
                    type: 'multiple',
                    options: ['New condition', 'Known condition'],
                },
            ],
        },
        {
            id: 'addit_patient_info',
            questions: [
                {
                    sub_id: 'allergies',
                    sub_q: 'Known allergies?',
                    type: 'string',
                },
                {
                    sub_id: 'chronic_conditions',
                    sub_q: 'Known chronic conditions (e.g. diabetes, asthma, heart disease, epilepsy)?',
                    type: 'string',
                },
            ],
        },
        {
            id: 'accessibility_support',
            questions: [
                {
                    sub_id: 'interpreter',
                    sub_q: 'Do you need an interpreter?',
                    type: 'yes_no',
                },
                {
                    sub_id: 'mobility',
                    sub_q: 'Do you need mobility support (wheelchair, etc.)?',
                    type: 'yes_no',
                },
            ],
        },
    ]
];

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
                <button data-answer="yes" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-xl font-semibold text-gray-700 hover:text-green-700 answer-btn">
                    <span class="text-green-600 mr-3">✓</span> Yes
                </button>
                <button data-answer="no" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-xl font-semibold text-gray-700 hover:text-red-700 answer-btn">
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
                        <button data-answer="${option}" class="p-5 border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center font-bold text-xl text-gray-700 hover:text-blue-700 answer-btn">
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
                    <button data-answer="${option}" class="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all capitalize text-xl font-semibold text-gray-700 hover:text-blue-700 answer-btn">
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
    
    // Event delegation for answer buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('answer-btn')) {
            const answer = e.target.getAttribute('data-answer');
            handleAnswerSelect(answer);
        }
    });
});
