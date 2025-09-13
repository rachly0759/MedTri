import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle, CheckCircle, User, Activity, Plus } from 'lucide-react';

const ERQueueSystem = () => {
  const [currentView, setCurrentView] = useState('queue'); // 'queue' or 'assessment'
  const [patients, setPatients] = useState([
    { id: 'P001', esi: 2, status: 'In Triage', waitTime: 15, arrivalTime: '14:30', chief_complaint: 'Chest pain' },
    { id: 'P002', esi: 3, status: 'Waiting', waitTime: 45, arrivalTime: '14:45', chief_complaint: 'Abdominal pain' },
    { id: 'P003', esi: 1, status: 'Being Seen', waitTime: 0, arrivalTime: '15:00', chief_complaint: 'Cardiac arrest' },
    { id: 'P004', esi: 4, status: 'Waiting', waitTime: 120, arrivalTime: '14:20', chief_complaint: 'Minor laceration' },
    { id: 'P005', esi: 3, status: 'Waiting', waitTime: 90, arrivalTime: '14:35', chief_complaint: 'Fever' }
  ]);

  const [assessmentData, setAssessmentData] = useState({
    vitalsStable: null,
    painLevel: null,
    chestPain: null,
    breathingDifficulty: null,
    consciousness: null,
    bleeding: null,
    onset: null,
    age: null
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [patientESI, setPatientESI] = useState(null);

  // ESI Calculation Logic
  const calculateESI = (data) => {
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
  };

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

  const getESIColor = (esi) => {
    const colors = {
      1: 'bg-red-600 text-white',
      2: 'bg-orange-500 text-white', 
      3: 'bg-yellow-500 text-black',
      4: 'bg-green-500 text-white',
      5: 'bg-blue-500 text-white'
    };
    return colors[esi] || 'bg-gray-500 text-white';
  };

  const getESILabel = (esi) => {
    const labels = {
      1: 'Immediate',
      2: 'Emergent',
      3: 'Urgent', 
      4: 'Less Urgent',
      5: 'Non-Urgent'
    };
    return labels[esi] || 'Unknown';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Waiting': return <Clock className="w-4 h-4" />;
      case 'In Triage': return <Activity className="w-4 h-4" />;
      case 'Being Seen': return <CheckCircle className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const handleAnswerSelect = (value) => {
    const currentQ = questions[currentQuestion];
    setAssessmentData(prev => ({
      ...prev,
      [currentQ.id]: value
    }));

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate ESI and show result
      const finalData = { ...assessmentData, [currentQ.id]: value };
      const esi = calculateESI(finalData);
      setPatientESI(esi);
      setShowResult(true);
    }
  };

  const addPatientToQueue = () => {
    const newPatient = {
      id: `P${String(patients.length + 1).padStart(3, '0')}`,
      esi: patientESI,
      status: 'Waiting',
      waitTime: Math.round(Math.random() * 60 + 30),
      arrivalTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      chief_complaint: 'Self-assessed symptoms'
    };
    
    setPatients(prev => [...prev, newPatient].sort((a, b) => a.esi - b.esi));
    
    // Reset form and return to queue
    resetAssessment();
    setCurrentView('queue');
  };

  const resetAssessment = () => {
    setAssessmentData({
      vitalsStable: null,
      painLevel: null,
      chestPain: null,
      breathingDifficulty: null,
      consciousness: null,
      bleeding: null,
      onset: null,
      age: null
    });
    setCurrentQuestion(0);
    setShowResult(false);
    setPatientESI(null);
  };

  const startAssessment = () => {
    resetAssessment();
    setCurrentView('assessment');
  };

  const sortedPatients = [...patients].sort((a, b) => a.esi - b.esi);

  // Queue Page
  if (currentView === 'queue') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8" />
              ER Queue Management System
            </h1>
            <p className="text-blue-100 mt-1">Real-time emergency department queue with intelligent triage</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Current Queue Status</h2>
              <button
                onClick={startAssessment}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-lg transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                New Patient Assessment
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4">
          {/* Queue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Total Patients</p>
                  <p className="text-2xl font-bold">{patients.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Avg Wait Time</p>
                  <p className="text-2xl font-bold">{Math.round(patients.reduce((acc, p) => acc + p.waitTime, 0) / patients.length)}m</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Critical Cases</p>
                  <p className="text-2xl font-bold">{patients.filter(p => p.esi <= 2).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">Patient Queue</h3>
              <p className="text-gray-600">Patients ordered by Emergency Severity Index (ESI)</p>
            </div>
            <div className="divide-y">
              {sortedPatients.map((patient, index) => (
                <div key={patient.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-gray-400 bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-semibold text-lg">{patient.id}</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getESIColor(patient.esi)}`}>
                            ESI {patient.esi} - {getESILabel(patient.esi)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{patient.chief_complaint}</span> • Arrived: {patient.arrivalTime}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(patient.status)}
                        <span className="font-medium text-gray-700">{patient.status}</span>
                      </div>
                      {patient.waitTime > 0 && (
                        <div className="text-sm text-gray-500">
                          Est. wait: {patient.waitTime}m
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assessment Page
  if (currentView === 'assessment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="w-8 h-8" />
                Patient Assessment
              </h1>
              <p className="text-blue-100 mt-1">Help us prioritize your care</p>
            </div>
            <button
              onClick={() => setCurrentView('queue')}
              className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              ← Back to Queue
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-xl p-8">
            {!showResult ? (
              <div>
                {/* Progress Header */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-gray-800">Symptom Assessment</h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full font-medium">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-6 text-lg">Please answer the following questions accurately to help us determine your care priority.</p>
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question */}
                <div className="mb-10">
                  <h3 className="text-2xl font-semibold mb-8 text-gray-800 leading-tight">
                    {questions[currentQuestion].question}
                  </h3>
                  
                  {questions[currentQuestion].type === 'yes_no' && (
                    <div className="space-y-4">
                      <button
                        onClick={() => handleAnswerSelect('yes')}
                        className="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-xl font-semibold text-gray-700 hover:text-green-700"
                      >
                        <span className="text-green-600 mr-3">✓</span> Yes
                      </button>
                      <button
                        onClick={() => handleAnswerSelect('no')}
                        className="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all text-xl font-semibold text-gray-700 hover:text-red-700"
                      >
                        <span className="text-red-600 mr-3">✗</span> No
                      </button>
                    </div>
                  )}

                  {questions[currentQuestion].type === 'scale' && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <span className="font-medium">No Pain (0)</span>
                        <span className="font-medium">Worst Possible Pain (10)</span>
                      </div>
                      <div className="grid grid-cols-6 gap-3">
                        {questions[currentQuestion].options.map(option => (
                          <button
                            key={option}
                            onClick={() => handleAnswerSelect(option)}
                            className="p-5 border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center font-bold text-xl text-gray-700 hover:text-blue-700"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {questions[currentQuestion].type === 'multiple' && (
                    <div className="space-y-4">
                      {questions[currentQuestion].options.map(option => (
                        <button
                          key={option}
                          onClick={() => handleAnswerSelect(option)}
                          className="w-full p-6 text-left border-3 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all capitalize text-xl font-semibold text-gray-700 hover:text-blue-700"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions[currentQuestion].type === 'number' && (
                    <div>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        className="w-full p-6 border-3 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-xl font-medium text-center"
                        placeholder="Enter your age (e.g., 45)"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            handleAnswerSelect(parseInt(e.target.value));
                          }
                        }}
                        onChange={(e) => {
                          if (e.target.value && e.target.value >= 0) {
                            setTimeout(() => handleAnswerSelect(parseInt(e.target.value)), 1000);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Results Screen */
              <div className="text-center">
                <div className="mb-10">
                  <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                  <h2 className="text-4xl font-bold mb-4 text-gray-800">Assessment Complete!</h2>
                  <p className="text-gray-600 text-xl">Thank you for providing your symptoms. Your priority level has been determined based on medical guidelines.</p>
                </div>

                <div className="mb-10">
                  <div className={`inline-flex items-center px-10 py-5 rounded-2xl text-2xl font-bold ${getESIColor(patientESI)} shadow-xl`}>
                    Priority Level {patientESI} - {getESILabel(patientESI)}
                  </div>
                  <div className="mt-8 p-8 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                    <p className="text-gray-700 text-xl leading-relaxed">
                      {patientESI <= 2 && "🚨 HIGH PRIORITY: You will be seen immediately. Please proceed to the triage desk right now for immediate assessment."}
                      {patientESI === 3 && "⚠️ URGENT CARE: You will be prioritized in our queue. Your estimated wait time is 30-60 minutes. Please remain in the waiting area."}
                      {patientESI >= 4 && "ℹ️ STANDARD CARE: You will be added to our queue in order of arrival. Please have a seat in the waiting area and we'll call you when ready."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={addPatientToQueue}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-xl font-bold text-xl transition-colors shadow-xl transform hover:scale-105"
                >
                  Add Me to the Queue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

export default ERQueueSystem;
