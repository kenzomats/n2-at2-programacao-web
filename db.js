const mysql = require('mysql2')
require('dotenv').config()

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER ||'root',
    password: process.env.DB_PASSWORD ||'',
    database: process.env.DB_NAME ||'tecnostore_db',
    port: process.env.DB_PORT || '3306'
})

db.connect(err =>{
    if (err) throw err;
    console.log('Conectado ao banco de dados')
})


module.exports = db
