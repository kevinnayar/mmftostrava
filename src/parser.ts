import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { constructFilePath, convertCsvToStravaActivities } from './utils';

config();

function getParserContext() {
  const dir = `src/data`;
  const inputPath = constructFilePath(dir, process.env.FILE_INPUT!);
  const outputPath = constructFilePath(dir, process.env.FILE_OUTPUT!);

  return {
    inputPath,
    outputPath,
  };
}

async function main() {
  const { inputPath, outputPath } = getParserContext();
  const activities = await convertCsvToStravaActivities(inputPath);
  writeFileSync(outputPath, JSON.stringify(activities, null, 2));
  console.log('🚀 Finished!!!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
