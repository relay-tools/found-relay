import fs from 'fs';
import path from 'path';

import { printSchema } from 'graphql/utilities';

import schema from './schema';

fs.writeFileSync(path.join(__dirname, 'schema.graphql'), printSchema(schema));
