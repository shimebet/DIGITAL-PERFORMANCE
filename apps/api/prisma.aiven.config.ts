import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({
  path: '.env.production',
  override: true,
});

const required = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
};

const url = new URL('mysql://localhost');

url.hostname = required('DATABASE_HOST');
url.port = required('DATABASE_PORT');
url.username = required('DATABASE_USER');
url.password = required('DATABASE_PASSWORD');
url.pathname = `/${required('DATABASE_NAME')}`;
url.searchParams.set(
  'sslcert',
  required('DATABASE_SSL_CA_PATH'),
);

url.searchParams.set('sslaccept', 'strict');

// Prisma's MySQL connector requires its own TLS configuration.
// We will verify the correct certificate settings before use.

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
  },

  datasource: {
    url: url.toString(),
  },
});