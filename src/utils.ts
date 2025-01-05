import * as csv from 'fast-csv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { v4 as getUuid } from 'uuid';
import {
  ExampleJsonType,
  ParsedCsv,
  StravaActivityItem,
  WithId,
} from './types';

function parseDateStringToISO8601(dateString: string) {
  const cleanDateStr = dateString.replace('.', '');
  const date = new Date(cleanDateStr + ' 08:00:00 CST');
  return date.toISOString();
}

function convertMilesToMeters(miles: string) {
  return parseInt((parseFloat(miles) * 1609.34).toString(), 10);
}

async function parseCsvFile(
  rawString: string,
  delimiter: string,
): Promise<ParsedCsv> {
  const readable = new Readable();
  readable.push(rawString);
  readable.push(null);

  return new Promise((resolve, reject) => {
    const rows: string[][] = [];
    const lengths: number[] = [];

    readable
      .pipe(
        csv.parse({
          headers: false,
          delimiter,
        }),
      )
      .on('data', (row: string[]) => {
        rows.push(row);
        lengths.push(row.length);
      })
      .on('end', () => {
        const numColumns = Math.max(...lengths);
        const filledRows: string[][] = [];

        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          if (row.length < numColumns) {
            const diff = numColumns - row.length;
            const empties: string[] = new Array(diff).fill('');
            filledRows.push([...row, ...empties]);
          } else {
            filledRows.push(row);
          }
        }

        resolve({
          rows: filledRows,
          numCols: Math.max(...lengths),
          numRows: rows.length,
        });
      })
      .on('error', (error) => reject(error));
  });
}

function convertCsvToJson(parsedCsv: ParsedCsv): Record<string, string>[] {
  if (parsedCsv.numRows < 2) {
    throw new Error('CSV does not contain enough rows of data');
  }

  const headers = parsedCsv.rows[0];
  const currRows = parsedCsv.rows.slice(1);
  const rows: Record<string, string>[] = [];

  for (let rowIndex = 0; rowIndex < currRows.length; rowIndex += 1) {
    const currRow = currRows[rowIndex];
    const row: Record<string, string> = {};

    for (let cellIndex = 0; cellIndex < currRow.length; cellIndex += 1) {
      const key = headers[cellIndex];
      const value = currRow[cellIndex];
      row[key] = value;
    }

    rows.push(row);
  }

  return rows;
}

function convertRowsToActivities(
  rows: ExampleJsonType[],
): StravaActivityItem[] {
  const keyMap = {
    date: 'Workout Date',
    duration: 'Workout Time (seconds)',
    distance: 'Distance (mi)',
    calories: 'Calories Burned (kcal)',
  };

  const activities: WithId<StravaActivityItem>[] = [];

  for (const row of rows) {
    if (row['Activity Type'] === 'Run') {
      const date = parseDateStringToISO8601(row[keyMap.date]);
      const parsedDate = new Date(date);
      const name = `Run on ${parsedDate.toLocaleDateString()}`;

      const activity: WithId<StravaActivityItem> = {
        id: getUuid(),
        name,
        type: 'Running',
        sport_type: 'Run',
        start_date_local: date,
        elapsed_time: parseInt(row[keyMap.duration], 10),
        description: name,
        distance: convertMilesToMeters(row[keyMap.distance]),
        calories: parseInt(row[keyMap.calories], 10),
      };

      activities.push(activity);
    }
  }

  return activities;
}

export async function convertCsvToStravaActivities(
  csvFilePath: string,
): Promise<StravaActivityItem[]> {
  const raw = readFileSync(csvFilePath, { encoding: 'utf-8' });
  const csv = await parseCsvFile(raw, ',');
  const rows = convertCsvToJson(csv) as ExampleJsonType[];
  const activities = convertRowsToActivities(rows);
  return activities;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function constructFilePath(...paths: string[]) {
  return join(process.cwd(), ...paths);
}
