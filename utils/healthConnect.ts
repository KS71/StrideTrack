import { Health } from '@capgo/capacitor-health';
import { WalkLog } from '../types';
import { Capacitor } from '@capacitor/core';

// Format: hc_2026-06-02T12:38:00.000Z
export const generateHealthConnectId = (startDateStr: string): string => {
  return `hc_${new Date(startDateStr).toISOString()}`;
};

// Formats a duration in seconds into a human-readable string (e.g. "52m 10s" or "3h 12m")
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m 0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
};

// Check if Health Connect is supported and available on this device
export const isHealthConnectAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Health Connect: Not on native platform (web fallback)');
    return false;
  }
  try {
    const { available } = await Health.isAvailable();
    return available;
  } catch (e) {
    console.error('Health Connect availability check failed:', e);
    return false;
  }
};

// Request authorization for steps, distance, active calories, and workouts
export const requestHealthConnectPermissions = async (): Promise<boolean> => {
  try {
    const isAvail = await isHealthConnectAvailable();
    if (!isAvail) return false;

    // Requesting read permissions for required data types (workouts is plural in the library definitions)
    await Health.requestAuthorization({
      read: ['distance', 'workouts']
    });
    return true;
  } catch (e) {
    console.error('Health Connect authorization failed:', e);
    return false;
  }
};

// Query recent walking and hiking workouts from Health Connect starting from an optional ISO date string
export const fetchRecentWalksAndHikes = async (sinceIsoString?: string): Promise<WalkLog[]> => {
  try {
    const isAvail = await isHealthConnectAvailable();
    if (!isAvail) {
      return [];
    }

    const endDate = new Date();
    let startDate = new Date();
    if (sinceIsoString) {
      startDate = new Date(sinceIsoString);
    } else {
      startDate.setDate(endDate.getDate() - 7);
    }

    console.log(`Health Connect: Querying workouts between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    const result = await Health.queryWorkouts({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (!result || !result.workouts) {
      console.log('Health Connect: No workouts returned.');
      return [];
    }

    console.log(`Health Connect: Retrieved ${result.workouts.length} raw workouts.`);

    // Filter workouts to only keep walking and hiking (case-insensitive)
    const walksAndHikes = result.workouts.filter(w => {
      const type = (w.workoutType || '').toLowerCase();
      return type === 'walking' || type === 'hiking';
    });

    console.log(`Health Connect: Found ${walksAndHikes.length} walks/hikes.`);

    return walksAndHikes.map(workout => {
      // Health Connect returns distance in meters (totalDistance), convert to kilometers
      const distanceInKm = workout.totalDistance ? workout.totalDistance / 1000 : 0;

      // Determine a friendly capitalized title based on type
      const rawType = workout.workoutType || 'walk';
      const capitalizedTitle = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();

      return {
        id: generateHealthConnectId(workout.startDate),
        date: new Date(workout.startDate).toISOString(),
        distance: parseFloat(distanceInKm.toFixed(2)),
        duration: formatDuration(workout.duration || 0),
        title: capitalizedTitle,
        source: workout.sourceName || 'Health Connect'
      };
    });
  } catch (e) {
    console.error('Health Connect: Failed to fetch recent walks/hikes:', e);
    return [];
  }
};
