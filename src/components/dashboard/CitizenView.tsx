/**
 * CitizenView Component - Comprehensive incident reporting modal
 * 
 * Features:
 * - Type selection (fire, medical, accident, crime)
 * - Severity selection
 * - Optional image upload
 * - Title and description
 * - Real-time geolocation
 * - Complete Supabase RPC integration
 */

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader, X, Image as ImageIcon, Sparkles, MapPin } from 'lucide-react';
import { reportIncident } from '@/api/incidents';
import { IncidentType } from '@/types';
import { useViewport } from '@/hooks/useViewport';
import { useResQStore } from '@/store/useResQStore';
import { analyzeIncidentImage, generateIncidentDescription, AIAnalysisResult } from '@/services/aiAnalysis';
import { reverseGeocode } from '@/services/geocoding';

export default function CitizenView() {
  const navigate = useNavigate();
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedType, setSelectedType] = useState<IncidentType>('fire');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useViewport();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);

      // Analyze image with AI
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeIncidentImage(file);
        setAiAnalysis(analysis);
        
        // Auto-suggest severity and type if confidence is high
        if (analysis.confidence > 70) {
          setSeverity(analysis.severity);
          if (analysis.incidentType !== 'other') {
            setSelectedType(analysis.incidentType as IncidentType);
          }
          
          // Enhance description with AI insights
          if (description) {
            const enhanced = await generateIncidentDescription(selectedType, description, analysis);
            setDescription(enhanced);
          }
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleEmergencyReport = async () => {
    // Validation
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setIsReporting(true);
    setError(null);
    
    try {
      // Get user's location (or use default for demo)
      let lat = 40.7589;
      let lng = -73.9851;
      
      // Try to get actual location
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 60000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          console.log('[CitizenView] Got user location:', { lat, lng });
          
          // Geocode location to get readable address
          setIsGeocodingLocation(true);
          try {
            const geocoded = await reverseGeocode(lat, lng);
            setLocationAddress(geocoded.address);
          } catch (geoError) {
            console.warn('[CitizenView] Geocoding failed:', geoError);
          } finally {
            setIsGeocodingLocation(false);
          }
        } catch (geoError) {
          console.warn('[CitizenView] Geolocation failed, using default:', geoError);
          // Add small random offset for demo
          lat += (Math.random() - 0.5) * 0.01;
          lng += (Math.random() - 0.5) * 0.01;
        }
      }

      // Create incident via RPC (handles image upload internally)
      console.log('[CitizenView] Reporting incident...', {
        type: selectedType,
        severity,
        title,
        hasImage: !!selectedImage,
      });

      // Map 'crime' to 'police' for database compatibility
      const dbType = selectedType === 'crime' ? 'police' : selectedType;

      const incidentId = await reportIncident({
        type: dbType,
        severity,
        title,
        description,
        lat,
        lng,
        address: locationAddress || `Reported from map`,
        image: selectedImage || undefined,
        userId: null,  // TODO: Get from auth context
      });
      
      console.log('[CitizenView] Incident created:', incidentId);
      
      // Manually reload incidents to ensure it appears
      const { loadIncidents } = useResQStore.getState();
      await loadIncidents();
      
      // Navigate to responder view to see the incident
      // Real-time subscription will automatically add it to the store
      navigate('/dashboard?mode=responder');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      setImagePreview(null);
      setSeverity('medium');
    } catch (error) {
      console.error('[CitizenView] Failed to report incident:', error);
      setError(error instanceof Error ? error.message : 'Failed to report incident');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: isMobile ? '100%' : 0 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: isMobile ? '100%' : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full ${isMobile ? 'h-full max-h-[95vh]' : 'max-w-md'}`}
      >
        <div className={`
          ${isMobile 
            ? 'h-full flex flex-col bg-white dark:bg-[#18181b] rounded-t-3xl' 
            : 'p-6 sm:p-8 bg-white dark:bg-[#232326] border-2 border-black dark:border-[#27272a] rounded-3xl shadow-xl'
          }
        `}>
          {/* Header */}
          <div className={`flex items-start justify-between ${isMobile ? 'p-6 pb-4 border-b border-gray-200 dark:border-[#27272a]' : 'mb-6'}`}>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-black dark:text-white mb-1">
                New Report
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Enter incident details below to dispatch units.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard?mode=responder')}
              className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-full transition-colors touch-manipulation"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - Scrollable on mobile */}
          <div className={`${isMobile ? 'flex-1 overflow-y-auto p-6 pt-4 pb-24' : 'p-6'} space-y-6`}>
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-2xl">
                <p className="text-red-700 dark:text-red-300 font-bold">{error}</p>
              </div>
            )}

            {/* Title Input */}
            <div className="mb-6">
              <label className="block font-bold text-black dark:text-white mb-3 text-base sm:text-lg">
                Incident Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the emergency"
                className={`
                  w-full p-4 border-2 border-gray-200 dark:border-[#27272a] rounded-2xl 
                  bg-white dark:bg-[#232326] text-black dark:text-white placeholder-gray-400 
                  focus:outline-none focus:border-black dark:focus:border-white 
                  transition-colors text-base
                `}
              />
            </div>

            {/* Incident Type */}
            <div className="mb-6">
              <label className="block font-bold text-black dark:text-white mb-3 text-base sm:text-lg">
                Incident Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedType('fire')}
                  className={`
                    p-4 sm:p-5 border-2 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 touch-manipulation
                    ${
                      selectedType === 'fire'
                        ? 'border-lime-brand bg-lime-brand text-black shadow-lg scale-105'
                        : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#232326] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 active:scale-95'
                    }
                  `}
                >
                  <span className="text-2xl sm:text-3xl">🔥</span>
                  <span className="text-base sm:text-lg">Fire</span>
                </button>
                <button
                  onClick={() => setSelectedType('medical')}
                  className={`
                    p-4 sm:p-5 border-2 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 touch-manipulation
                    ${
                      selectedType === 'medical'
                        ? 'border-lime-brand bg-lime-brand text-black shadow-lg scale-105'
                        : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#232326] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 active:scale-95'
                    }
                  `}
                >
                  <span className="text-2xl sm:text-3xl">💊</span>
                  <span className="text-base sm:text-lg">Medical</span>
                </button>
                <button
                  onClick={() => setSelectedType('accident')}
                  className={`
                    p-4 sm:p-5 border-2 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 touch-manipulation
                    ${
                      selectedType === 'accident'
                        ? 'border-lime-brand bg-lime-brand text-black shadow-lg scale-105'
                        : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#232326] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 active:scale-95'
                    }
                  `}
                >
                  <span className="text-2xl sm:text-3xl">🚗</span>
                  <span className="text-base sm:text-lg">Accident</span>
                </button>
                <button
                  onClick={() => setSelectedType('crime')}
                  className={`
                    p-4 sm:p-5 border-2 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 touch-manipulation
                    ${
                      selectedType === 'crime'
                        ? 'border-lime-brand bg-lime-brand text-black shadow-lg scale-105'
                        : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#232326] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 active:scale-95'
                    }
                  `}
                >
                  <span className="text-2xl sm:text-3xl">🚓</span>
                  <span className="text-base sm:text-lg">Crime</span>
                </button>
              </div>
            </div>

            {/* Severity Selection */}
            <div className="mb-6">
              <label className="block font-bold text-black dark:text-white mb-3 text-base sm:text-lg">
                Severity Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSeverity(level)}
                    className={`
                      p-3 border-2 rounded-xl font-bold transition-all touch-manipulation capitalize text-sm
                      ${
                        severity === level
                          ? level === 'critical' ? 'border-red-500 bg-red-500 text-white' :
                            level === 'high' ? 'border-orange-500 bg-orange-500 text-white' :
                            level === 'medium' ? 'border-yellow-500 bg-yellow-500 text-black' :
                            'border-green-500 bg-green-500 text-white'
                          : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#232326] text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block font-bold text-black dark:text-white mb-3 text-base sm:text-lg">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's happening? Include important details..."
                className={`
                  w-full p-4 border-2 border-gray-200 dark:border-[#27272a] rounded-2xl 
                  bg-white dark:bg-[#232326] text-black dark:text-white placeholder-gray-400 
                  resize-none focus:outline-none focus:border-black dark:focus:border-white 
                  transition-colors text-base
                  ${isMobile ? 'min-h-[120px]' : ''}
                `}
                rows={isMobile ? 5 : 4}
              />
            </div>

            {/* Image Upload with AI Analysis */}
            <div className="mb-6">
              <label className="block font-bold text-black dark:text-white mb-3 text-base sm:text-lg flex items-center gap-2">
                Add Photo (Optional)
                {isAnalyzing && <Sparkles className="w-5 h-5 text-lime-brand animate-pulse" />}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-2xl border-2 border-gray-200 dark:border-[#27272a]"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setAiAnalysis(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                        <div className="flex items-center gap-2 text-white">
                          <Loader className="w-5 h-5 animate-spin" />
                          <span className="font-bold">Analyzing with AI...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Analysis Results */}
                  {aiAnalysis && aiAnalysis.confidence > 0 && (
                    <div className="p-4 bg-lime-brand/10 border-2 border-lime-brand rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-lime-brand" />
                        <span className="font-bold text-black dark:text-white">AI Analysis</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {aiAnalysis.confidence}% confident
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {aiAnalysis.description}
                      </p>
                      {aiAnalysis.hazards.length > 0 && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          ⚠️ Hazards: {aiAnalysis.hazards.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-[#27272a] rounded-2xl hover:border-gray-400 dark:hover:border-gray-600 transition-colors flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                    <Sparkles className="w-6 h-6 text-lime-brand" />
                  </div>
                  <span className="font-bold text-gray-600 dark:text-gray-400">Tap to upload photo</span>
                  <span className="text-sm text-gray-500 dark:text-gray-500">AI-powered analysis • Max 10MB</span>
                </button>
              )}
            </div>

            {/* Location Display */}
            {locationAddress && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-2xl">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-black dark:text-white text-sm mb-1">Location</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{locationAddress}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Fixed on mobile */}
          <div className={`${isMobile ? 'p-6 pt-4 border-t border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] sticky bottom-0' : 'mt-6'}`}>
            <button
              onClick={handleEmergencyReport}
              disabled={isReporting}
              className={`
                w-full p-4 sm:p-5 font-bold text-base sm:text-lg rounded-2xl transition-all touch-manipulation
                ${
                  isReporting
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-[0.98]'
                }
              `}
            >
              {isReporting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

