import fs from 'fs';
import { printSchema } from 'graphql/utilities';
import path from 'path';

import schema from '../src/data/schema';

fs.writeFileSync(
  path.join(__dirname, '../src/data/schema.graphql'),
  printSchema(schema),
);
