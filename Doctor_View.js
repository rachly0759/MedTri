import React, { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Stethoscope, Users, Clock, CheckCircle2, Thermometer, RotateCcw } from 'lucide-react';

const ESITriageSystem = () => {
  const [patientAge, setPatientAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('years');
  const [vitals, setVitals] = useState({
    heartRate: '',
    respiratoryRate: '',
    spO2: '',
    temperature: ''
  });
  const [level1Criteria, setLevel1Criteria] = useState([]);
  const [level2Criteria, setLevel2Criteria] = useState([]);
  const [resourceCount, setResourceCount] = useState(null);
  const [finalLevel, setFinalLevel] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');

  const level1CheckboxCriteria = [
    "Unresponsive patient (nonverbal, not following commands, requires noxious stimulus)",
    "Cardiac/pulmonary arrest or appears imminent",
    "Severe respiratory distress requiring immediate airway support",
    "Ineffective gas exchange with SpO₂ < 90% (not patient's norm) with respiratory compromise",
    "Profound hypotension with signs of hypoperfusion",
    "Severe bradycardia or tachycardia requiring immediate intervention"
  ];

  const level2Categories = {
    cardiovascular: [
      "Active chest pain suspicious for acute coronary syndrome",
      "Abnormal ECG findings",
      "Recent COVID-19 infection (increased cardiac risk)"
    ],
    neurological: [
      "Signs of stroke without level 1 criteria",
      "New onset confusion, lethargy, or disorientation",
      "Post-ictal state",
      "Thunderclap headache",
      "Headache with neck pain/nuchal rigidity",
      "Headache with fever, vomiting, altered mental status"
    ],
    respiratory: [
      "Increasing respiratory effort",
      "Respiratory distress with potential for rapid deterioration",
      "Tachypnea, audible stridor, wheezing",
      "Speaking in 2-3 word sentences",
      "Tripoding position"
    ],
    abdominal: [
      "Possible ectopic pregnancy (hemodynamically stable)",
      "Severe abdominal pain refractory to analgesia",
      "Signs of sepsis",
      "Postpartum hemorrhage"
    ],
    obstetric: [
      "Pregnant/postpartum with SBP < 90 or > 150 mmHg",
      "Heavy vaginal bleeding with abnormal vitals",
      "Chest pain/shortness of breath in pregnancy",
      "Abdominal pain or headache in pregnancy"
    ],
    genitourinary: [
      "Testicular/scrotal pain (concern for torsion)",
      "Severe flank pain",
      "Unilateral lower quadrant pain (concern for ovarian torsion)"
    ],
    infectious: [
      "Fever in immunocompromised patients",
      "Transplant recipients with fever/signs of infection",
      "Patients on chemotherapy with fever"
    ],
    trauma: [
      "Falls ≥ 20 feet (6 meters)",
      "Ejection from vehicle",
      "Vehicle requiring mechanical extrication",
      "Sexual assault",
      "Penetrating trauma without hemodynamic instability",
      "High-risk orthopedic injuries with neurovascular compromise"
    ],
    ent: [
      "Unable to manage secretions",
      "Respiratory stridor",
      "Posterior nosebleed with significant bleeding",
      "Esophageal button battery ingestion (especially children < 6 years)"
    ],
    ocular: [
      "Sudden vision loss",
      "Sudden diplopia",
      "Anisocoria or exophthalmos with distress",
      "Eye trauma with vision threat"
    ],
    mentalHealth: [
      "Actively suicidal or homicidal",
      "Psychotic or violent behavior",
      "Severe psychological distress"
    ],
    timeSensitive: [
      "Needle stick injury in healthcare worker",
      "Sexual assault survivor"
    ],
    severePain: [
      "Systemic pain (renal colic, sickle cell crisis, cancer pain) - 7/10 or greater",
      "Severe psychological distress",
      "Distraught behavior following trauma",
      "Combativeness at triage",
      "Acute grief reaction"
    ],
    pediatricSpecific: [
      "Temperature > 38°C (100.4°F) in infants < 90 days",
      "Temperature < 36°C (96.8°F) at any age",
      "Temperature > 38.5°C (101.3°F) in children > 3 months",
      "Subtle mental status changes",
      "Grunting, belly breathing, retractions",
      "Button battery or earth magnet ingestion"
    ]
  };

  const getAgeInYears = () => {
    const ageValue = parseFloat(patientAge);
    if (isNaN(ageValue)) return 0;
    if (ageUnit === 'months') {
      return ageValue / 12;
    }
    return ageValue;
  };

  const getAgeInMonths = () => {
    const ageValue = parseFloat(patientAge);
    if (isNaN(ageValue)) return 0;
    if (ageUnit === 'years') {
      return ageValue * 12;
    }
    return ageValue;
  };

  const getAgeInDays = () => {
    const ageInMonths = getAgeInMonths();
    return ageInMonths * 30;
  };

  const checkVitalSigns = () => {
    if (!vitals.heartRate || !vitals.respiratoryRate || !vitals.spO2) return false;
    
    const age = getAgeInYears();
    const hr = parseInt(vitals.heartRate);
    const rr = parseInt(vitals.respiratoryRate);
    const spo2 = parseInt(vitals.spO2);

    if (age >= 18) {
      // Adult criteria: HR > 100, RR > 20, SpO₂ < 92%
      if (hr > 100 || rr > 20 || spo2 < 92) {
        return true;
      }
    } else {
      // Pediatric criteria
      const pediatricThresholds = [
        { ageRange: [0, 1/12], hrThreshold: 190, rrThreshold: 60 },
        { ageRange: [1/12, 1], hrThreshold: 180, rrThreshold: 55 },
        { ageRange: [1, 3], hrThreshold: 140, rrThreshold: 40 },
        { ageRange: [3, 5], hrThreshold: 120, rrThreshold: 35 },
        { ageRange: [5, 12], hrThreshold: 120, rrThreshold: 30 },
        { ageRange: [12, 18], hrThreshold: 100, rrThreshold: 20 }
      ];

      for (const threshold of pediatricThresholds) {
        if (age >= threshold.ageRange[0] && age < threshold.ageRange[1]) {
          if (hr > threshold.hrThreshold || rr > threshold.rrThreshold) {
            return true;
          }
          break;
        }
      }
    }
    return false;
  };

  const checkTemperatureCriteria = () => {
    const temp = parseFloat(vitals.temperature);
    const ageInDays = getAgeInDays();
    const ageInMonths = getAgeInMonths();
    
    if (!temp) return false;

    if (temp < 36) return true;
    if (ageInDays < 90 && temp > 38) return true;
    if (ageInMonths > 3 && temp > 38.5) return true;
    
    return false;
  };

  const calculateESILevel = () => {
    // Level 1: Critical vitals or critical symptoms
    if (checkVitalSigns() || level1Criteria.length > 0) {
      return 1;
    }
    
    // Level 2: Temperature criteria or high-risk symptoms
    if (checkTemperatureCriteria() || level2Criteria.length > 0) {
      return 2;
    }
    
    // Levels 3-5: Based on resources
    if (resourceCount === null) return null;
    if (resourceCount >= 2) return 3;
    if (resourceCount === 1) return 4;
    return 5;
  };

  useEffect(() => {
    setFinalLevel(calculateESILevel());
  }, [patientAge, ageUnit, vitals, level1Criteria, level2Criteria, resourceCount]);

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-red-500 text-white',
      2: 'bg-orange-500 text-white',
      3: 'bg-yellow-500 text-black',
      4: 'bg-green-500 text-white',
      5: 'bg-blue-500 text-white'
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const getLevelDescription = (level) => {
    const descriptions = {
      1: 'Immediate - Life-threatening condition requiring immediate intervention',
      2: 'Emergent - High-risk condition that should not wait',
      3: 'Urgent - Stable but requiring multiple resources (2+)',
      4: 'Less Urgent - Stable condition requiring one resource',
      5: 'Non-urgent - Stable condition requiring only examination'
    };
    return descriptions[level] || '';
  };

  const submitAssessment = async () => {
    if (!finalLevel) {
      setSubmissionMessage('Please complete the assessment before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage('');
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmissionMessage(`Assessment submitted successfully. Patient assigned to ESI Level ${finalLevel}.`);
    } catch (error) {
      setSubmissionMessage('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAssessment = () => {
    setPatientAge('');
    setAgeUnit('years');
    setVitals({ heartRate: '', respiratoryRate: '', spO2: '', temperature: '' });
    setLevel1Criteria([]);
    setLevel2Criteria([]);
    setResourceCount(null);
    setFinalLevel(null);
    setSubmissionMessage('');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Stethoscope className="w-8 h-8 text-blue-600 mr-2" />
          <h1 className="text-3xl font-bold text-gray-800">Emergency Severity Index (ESI) Triage Assessment</h1>
        </div>
        <p className="text-gray-600">Complete assessment form - ESI level calculated automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Assessment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Information */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Patient Information</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Patient Category</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="patientCategory"
                    value="adult"
                    checked={getAgeInYears() >= 18 || (patientAge && ageUnit === 'years' && parseFloat(patientAge) >= 18)}
                    onChange={() => {
                      setPatientAge('18');
                      setAgeUnit('years');
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">Adult (≥18 years)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="patientCategory"
                    value="pediatric"
                    checked={patientAge && getAgeInYears() < 18}
                    onChange={() => {
                      setPatientAge('');
                      setAgeUnit('months');
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">Pediatric (&lt;18 years)</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {getAgeInYears() >= 18 ? 'Patient Age' : 'Child Age'}
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.1"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter age"
                />
                <select
                  value={ageUnit}
                  onChange={(e) => setAgeUnit(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
            
            <h3 className="text-lg font-medium mb-3 text-gray-800">Vital Signs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={vitals.heartRate}
                  onChange={(e) => setVitals({...vitals, heartRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Respiratory Rate</label>
                <input
                  type="number"
                  value={vitals.respiratoryRate}
                  onChange={(e) => setVitals({...vitals, respiratoryRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SpO₂ (%)</label>
                <input
                  type="number"
                  value={vitals.spO2}
                  onChange={(e) => setVitals({...vitals, spO2: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Level 1 Assessment */}
          <div className="bg-red-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">Level 1 - Critical Conditions</h2>
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Vital Signs Status</h3>
              <div className="p-3 bg-white rounded border">
                <p className={`font-medium ${checkVitalSigns() ? 'text-red-600' : 'text-green-600'}`}>
                  {checkVitalSigns() ? '⚠️ CRITICAL VITALS DETECTED → ESI LEVEL 1' : '✓ Vitals within normal range'}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4 text-red-800">Clinical Criteria - Check all that apply:</h3>
            <div className="space-y-3">
              {level1CheckboxCriteria.map((criterion, index) => (
                <label key={index} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={level1Criteria.includes(criterion)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLevel1Criteria([...level1Criteria, criterion]);
                      } else {
                        setLevel1Criteria(level1Criteria.filter(item => item !== criterion));
                      }
                    }}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 text-sm">{criterion}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Level 2 Assessment */}
          <div className="bg-orange-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <Heart className="w-6 h-6 text-orange-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">Level 2 - High-Risk Conditions</h2>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Temperature Status</h3>
              <div className="p-3 bg-white rounded border">
                <p className={`font-medium ${checkTemperatureCriteria() ? 'text-orange-600' : 'text-green-600'}`}>
                  {checkTemperatureCriteria() ? '⚠️ FEVER CRITERIA MET → ESI LEVEL 2' : '✓ Temperature criteria not met'}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4 text-orange-800">Clinical Criteria - Check all that apply:</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(level2Categories).map(([category, criteria]) => (
                <div key={category} className="border-b border-orange-200 pb-3">
                  <h4 className="font-medium text-orange-700 mb-2 capitalize text-sm">
                    {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h4>
                  <div className="space-y-2">
                    {criteria.map((criterion, index) => (
                      <label key={index} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={level2Criteria.includes(criterion)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLevel2Criteria([...level2Criteria, criterion]);
                            } else {
                              setLevel2Criteria(level2Criteria.filter(item => item !== criterion));
                            }
                          }}
                          className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <span className="text-gray-700 text-xs">{criterion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Assessment */}
          <div className="bg-yellow-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <Users className="w-6 h-6 text-yellow-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">Levels 3-5 - Resource Assessment</h2>
            </div>

            <h3 className="text-lg font-semibold mb-4 text-yellow-800">How many ESI resources will this patient require?</h3>
            
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resources"
                  value="0"
                  checked={resourceCount === 0}
                  onChange={() => setResourceCount(0)}
                  className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <span className="text-gray-700 font-medium">0 resources → ESI Level 5</span>
                  <p className="text-sm text-gray-600">History, physical exam, prescription only</p>
                </div>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resources"
                  value="1"
                  checked={resourceCount === 1}
                  onChange={() => setResourceCount(1)}
                  className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <span className="text-gray-700 font-medium">1 resource → ESI Level 4</span>
                  <p className="text-sm text-gray-600">Single test, procedure, or intervention</p>
                </div>
              </label>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="resources"
                  value="2"
                  checked={resourceCount >= 2}
                  onChange={() => setResourceCount(2)}
                  className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <span className="text-gray-700 font-medium">2+ resources → ESI Level 3</span>
                  <p className="text-sm text-gray-600">Multiple tests, procedures, or interventions</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {finalLevel ? (
              <div>
                <div className={`p-6 rounded-lg mb-4 text-center ${getLevelColor(finalLevel)}`}>
                  <div className="text-4xl font-bold mb-2">ESI {finalLevel}</div>
                  <div className="text-sm font-medium">{getLevelDescription(finalLevel)}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Assessment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Age:</span>
                      <span className="text-gray-600 ml-2">{patientAge} {ageUnit}</span>
                    </div>
                    {(checkVitalSigns() || checkTemperatureCriteria()) && (
                      <div>
                        <span className="font-medium text-gray-700">Critical Findings:</span>
                        <div className="text-gray-600 ml-2">
                          {checkVitalSigns() && <div>• Critical vital signs</div>}
                          {checkTemperatureCriteria() && <div>• Temperature criteria</div>}
                        </div>
                      </div>
                    )}
                    {level1Criteria.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Level 1 Criteria:</span>
                        <div className="text-gray-600 ml-2">{level1Criteria.length} selected</div>
                      </div>
                    )}
                    {level2Criteria.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Level 2 Criteria:</span>
                        <div className="text-gray-600 ml-2">{level2Criteria.length} selected</div>
                      </div>
                    )}
                    {finalLevel >= 3 && resourceCount !== null && (
                      <div>
                        <span className="font-medium text-gray-700">Resources:</span>
                        <span className="text-gray-600 ml-2">{resourceCount} required</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {submissionMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-sm text-center ${
                    submissionMessage.includes('successfully') ? 'bg-green-100 text-green-800' : 
                    submissionMessage.includes('failed') ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                  }`}>
                    {submissionMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 p-6 rounded-lg text-center">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Complete patient information and vital signs to see ESI level</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={submitAssessment}
                disabled={isSubmitting || !finalLevel}
                className={`w-full px-6 py-3 rounded-lg font-medium ${
                  isSubmitting || !finalLevel
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : 'Submit Assessment'}
              </button>
              
              <button
                onClick={resetAssessment}
                className="w-full px-6 py-3 rounded-lg font-medium bg-gray-600 text-white hover:bg-gray-700 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESITriageSystem;
