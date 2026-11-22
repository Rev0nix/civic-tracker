/**
 * Lokify Civic Issue Tracking Platform - Domain Type Definitions
 */

export type IssueStatus =
  | 'Open'
  | 'Acknowledged'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Reopened';

export type IssueCategory =
  | 'Pothole'
  | 'Streetlight'
  | 'Water & Drainage'
  | 'Garbage & Waste'
  | 'Road Defect'
  | 'Other';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface CivicIssue {
  id: string | number;
  title: string;
  description: string;
  category_id: string | number;
  status: IssueStatus;
  latitude?: number | null;
  longitude?: number | null;
  location?: GeoCoords | { coordinates: [number, number] } | string | null;
  address?: string | null;
  photo_url?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  created_at: string;
  updated_at?: string | null;
  upvotes?: number;
}

export type MapEngineMode = 'google' | 'leaflet';

export interface SMSDispatchRecord {
  id: string;
  toPhone: string;
  message: string;
  issueId: string | number | null;
  eventType: string;
  timestamp: string;
  delivered: boolean;
}

export interface MapPinConfig {
  coords: GeoCoords;
  color: string;
  title: string;
  issueId: string | number;
}
