const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) console.error("Missing postgres connection string");
const pool = new Pool({connectionString, ssl: true});

const createOrg = async (options) => {

}

module.exports = {
  createOrg,
  pool,
}
