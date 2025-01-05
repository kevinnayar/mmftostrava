export type ParsedCsv = {
  rows: string[][];
  numCols: number;
  numRows: number;
};

export type TabularJson = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ExampleJsonType = {
  'Date Submitted': string;
  'Workout Date': string;
  'Activity Type': string;
  'Calories Burned (kcal)': string;
  'Distance (mi)': string;
  'Workout Time (seconds)': string;
  'Avg Pace (min/mi)': string;
  'Max Pace (min/mi)': string;
  'Avg Speed (mi/h)': string;
  'Max Speed (mi/h)': string;
  'Avg Heart Rate': string;
  Steps: string;
  Notes: string;
  Source: string;
  Link: string;
};

export type ActivityItem = {
  id: string;
  sport: 'Running';
  date: string;
  duration: number;
  distance: number;
  calories: number;
};

export type StravaActivityItem = {
  name: string;
  type: 'Running';
  sport_type: 'Run';
  start_date_local: string;
  elapsed_time: number;
  description: string;
  distance: number;
  calories: number;
};

export type WithId<T> = T & {
  id: string;
};
