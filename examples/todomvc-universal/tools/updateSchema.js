import fs from 'fs';
import path from 'path';

import { printSchema } from 'graphql/utilities';

import schema from '../src/data/schema';

fs.writeFileSync(
  path.join(__dirname, '../src/data/schema.graphql'),
  printSchema(schema),
);
