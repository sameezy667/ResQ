/**
 * ImageGallery Component - Display incident images in grid
 * Adapted for ResQ design system
 */

import { Incident } from '@/types';
import { MapPin, Clock, AlertCircle } from 'lucide-react';

interface ImageGalleryProps {
  incidents: Incident[];
}

export default function ImageGallery({ incidents }: ImageGalleryProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No incidents with images</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {incidents.map((incident) => (
        <div 
          key={incident.id}
          className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden hover:border-lime-brand dark:hover:border-lime-brand transition-colors"
        >
          {/* Image */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
            <img 
              src={incident.imageUrl} 
              alt={`Incident ${incident.id}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
            {/* Severity badge */}
            <div className="absolute top-3 right-3">
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold
                ${incident.severity === 'critical' ? 'bg-lime-brand text-black' :
                  incident.severity === 'high' ? 'bg-red-500 text-white' :
                  incident.severity === 'medium' ? 'bg-yellow-500 text-black' :
                  'bg-blue-500 text-white'}
              `}>
                {incident.severity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="p-4">
            <h3 className="font-bold text-black dark:text-white capitalize mb-2">
              {incident.type} Emergency
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
              {incident.description}
            </p>
            
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{incident.location.address || 'Coordinates only'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{new Date(incident.reportedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
