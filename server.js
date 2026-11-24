const express = require('express')
const app = express()
const path = require('path')
const db = require('./db')
const port = 3000

app.use(express.static(path.join(__dirname, 'public')))



app.get('/', (req, res) =>{
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.use(express.json())
const apiRoutes = require(('./routes/api'))
app.use('/api', apiRoutes)

app.listen(port, ()=>{
    console.log("servidor funcionando")
})