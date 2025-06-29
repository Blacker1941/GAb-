import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: 'mysql.db.bot-hosting.net',
  user: 'u421748_bRrlM26fjJ',
  password: 'bd3rRJx@NRpiLSru^efCkVNZ',
  database: 's421748_Blackerism',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
