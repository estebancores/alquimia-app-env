require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DB_URL,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_api'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DB_URL,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_api'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
