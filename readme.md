# mmf to strava

This project is to help migrate running data from Map My Fitness (MMF) to Strava. Your lifetime running data can be exported from MMF as a CSV file.

There are two utilities in this project:
1. Parser
2. Server

## Parser

The parser utility converts a CSV export of workout data into Strava-compatible activity format.



### Process

1. The parser reads from `src/data/${process.env.FILE_INPUT}`. This is set in `.env` and is `user_workout_history.csv` by default.
1. Converts the CSV data into Strava activity format
1. Outputs the result to `src/data/${process.env.FILE_OUTPUT}`. This is set in `.env` and is `workouts.json` by default.

### Usage

```bash
npm run parser
```

## Server

Once the parser has run, the server utility provides an API for syncing workout data to Strava.

### Process

1. The server starts a local server on `http://localhost:${process.env.PORT}`. This is set in `.env` and is `3000` by default.
1. Once the server is running, you can use the Strava API to sync workout data to Strava by visiting `http://localhost:${process.env.PORT}/strava/auth`. This will redirect you to Strava's authorization page.
1. Once you have authorized the application, Strava will redirect you back to `http://localhost:${process.env.PORT}/strava/auth/callback`.
1. The server will then use the Strava API to sync the workout data to Strava.
1. The server will store the synced IDs in `src/data/${process.env.FILE_SYNCHED_IDS}`. This is set in `.env` and is `ids-synched.txt` by default.
1. The server will store the errored IDs in `src/data/${process.env.FILE_ERRORED_IDS}`. This is set in `.env` and is `ids-errored.txt` by default.

### Usage

```bash
npm run server
```

### Environment Variables

Create a `.env` file in the project root copying sample.env and setting the following variables:

- `FILE_INPUT` - The name of the input CSV file (default: `user_workout_history.csv`)
- `FILE_OUTPUT` - The name of the output JSON file (default: `workouts.json`)
- `FILE_SYNCHED_IDS` - The name of the file to store synced IDs (default: `ids-synched.txt`)  
- `FILE_ERRORED_IDS` - The name of the file to store errored IDs (default: `ids-errored.txt`)
- `PORT` - The port to run the server on (default: `3000`)
- `STRAVA_CLIENT_ID` - The Strava client ID (required)
- `STRAVA_CLIENT_SECRET` - The Strava client secret (required)
- `STRAVA_REDIRECT_URI` - The Strava redirect URI (required)
