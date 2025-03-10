import * as dotenv from 'dotenv';
import * as joi from 'joi';
import * as fs from 'fs';

// Asegurar que el archivo .env existe antes de cargarlo
const envPath = '/sysx/progs/rvia/cnf/.env';
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Archivo .env cargado correctamente.');
} else {
  console.error(`Error: No se encontró el archivo .env en ${envPath}`);
  process.exit(1);
}

// Mostrar las variables de entorno después de la carga
console.log('Variables después de dotenv.config:', process.env);

const envsSchema = joi.object({
  DB_HOST: joi.string().required(),
  DB_USERNAME: joi.string().required(),
  DB_PASSWORD: joi.string().required(),
  DB_NAME: joi.string().required(),
  DB_PORT: joi.number().required(),
  PORT: joi.number().required(),
  JWT_SECRET: joi.string().required(),
  SECRET_KEY: joi.string().required(),
}).unknown(true);

const { error, value } = envsSchema.validate({ ...process.env });

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const envs = {
  dbHost: value.DB_HOST,
  dbUsername: value.DB_USERNAME,
  dbPassword: value.DB_PASSWORD,
  dbName: value.DB_NAME,
  dbPort: value.DB_PORT,
  port: value.PORT,
  jwtSecret: value.JWT_SECRET,
  secretKey: value.SECRET_KEY,
};
