require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DB_URL,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_api'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DB_URL,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations_api'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
