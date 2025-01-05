import bodyParser from 'body-parser';
import { config } from 'dotenv';
import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { z } from 'zod';
import { StravaActivityItem, WithId } from './types';
import { constructFilePath, sleep } from './utils';

config();

function getIds(filePath: string) {
  const raw = readFileSync(filePath, { encoding: 'utf-8' });
  const ids = new Set(raw.split('\n').map((id) => id.trim()));
  return ids;
}

function getWorkouts(filePath: string) {
  const raw = readFileSync(filePath, { encoding: 'utf-8' });
  const json = JSON.parse(raw) as WithId<StravaActivityItem>[];
  return json;
}

function getServerContext() {
  const dir = `src/data`;
  const outputPath = constructFilePath(dir, process.env.FILE_OUTPUT!);
  const syncedIdsPath = constructFilePath(dir, process.env.FILE_SYNCHED_IDS!);
  const erroredIdsPath = constructFilePath(dir, process.env.FILE_ERRORED_IDS!);

  const port = process.env.PORT!;
  const clientId = process.env.STRAVA_CLIENT_ID!;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
  const redirectUri = process.env.STRAVA_REDIRECT_URI!;

  const synchedIds = getIds(syncedIdsPath);
  const erroredIds = getIds(erroredIdsPath);
  const workouts = getWorkouts(outputPath);
  console.log({
    port,
    clientId,
    clientSecret,
    redirectUri,
    synchedIds,
    erroredIds,

    syncedIdsPath,
    erroredIdsPath,
    outputPath,
  });

  return {
    port,
    clientId,
    clientSecret,
    redirectUri,
    synchedIds,
    erroredIds,
    workouts,
    syncedIdsPath,
    erroredIdsPath,
    outputPath,
  };
}

const app = express();
const ctx = getServerContext();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let accessToken: string | null = null;
let refreshToken: string | null = null;
let expiresAt: number | null = null;

async function startSync() {
  if (!accessToken) {
    throw new Error('No access token');
  }

  const synchedIds = new Set<string>(ctx.synchedIds);
  const erroredIds = new Set<string>(ctx.erroredIds);

  let skipped = 0;
  let synched = 0;
  let errored = 0;

  for (const workout of ctx.workouts) {
    const { id } = workout;

    if (synchedIds.has(id)) {
      console.log(`Skipping ${id}`);
      skipped += 1;
      continue;
    }

    try {
      const response = await fetch('https://www.strava.com/api/v3/activities', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workout),
      });

      const data = await response.json();
      if (response.status !== 201) {
        errored += 1;
        erroredIds.add(id);
        writeFileSync(ctx.erroredIdsPath, Array.from(erroredIds).join('\n'));

        console.error(
          `Error - expected 201, got ${response.status}, id: ${id}`,
        );
        console.error(data);
        continue;
      }

      synched += 1;
      synchedIds.add(id);
      writeFileSync(ctx.syncedIdsPath, Array.from(synchedIds).join('\n'));

      console.log(`Synced ${id}, "${data?.name || 'No name'}"`);

      await sleep(500 + Math.random() * 500);
    } catch (error) {
      errored += 1;
      erroredIds.add(id);
      writeFileSync(ctx.erroredIdsPath, Array.from(erroredIds).join('\n'));

      console.error(`Caught Error, id: ${id}`);
      console.error(error);
    }
  }

  console.log('🚀 Finished!!!', {
    synched,
    skipped,
    errored,
  });
}

app.get('/strava/auth', (req, res) => {
  const params = new URLSearchParams({
    client_id: ctx.clientId,
    response_type: 'code',
    redirect_uri: ctx.redirectUri,
    approval_prompt: 'auto',
    scope: 'activity:write',
  });
  const url = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  res.redirect(url);
});

app.get('/strava/auth/callback', async (req, res) => {
  const code = z.string().parse(req.query.code);

  const params = new URLSearchParams({
    client_id: ctx.clientId,
    client_secret: ctx.clientSecret,
    code,
    grant_type: 'authorization_code',
  });

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const { access_token, refresh_token, expires_at } = await response.json();

    accessToken = access_token;
    refreshToken = refresh_token;
    expiresAt = expires_at;

    startSync(); // don't await this

    res.json({
      message: 'Authentication successful! You can now make API calls.',
      accessToken,
      refreshToken,
      expiresAt,
    });
  } catch (error) {
    console.error(
      'Error exchanging code for tokens:',
      error.response?.data || error.message,
    );
    res.status(500).send('Authentication failed.');
  }
});

app.post('/auth/strava/refresh', async (req, res) => {
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const params = new URLSearchParams({
    client_id: ctx.clientId,
    client_secret: ctx.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    const { access_token, refresh_token, expires_at } = data;

    accessToken = access_token;
    refreshToken = refresh_token;
    expiresAt = expires_at;

    startSync(); // don't await this

    res.json({
      message:
        'Re-authentication successful! You can now continue making API calls.',
      accessToken,
      refreshToken,
      expiresAt,
    });
  } catch (error) {
    console.error(
      'Error refreshing token:',
      error.response?.data || error.message,
    );
    res.status(500).send('Failed to refresh token.');
  }
});

app.listen(ctx.port, () => {
  console.log(`Server is running on port ${ctx.port}`);
});
