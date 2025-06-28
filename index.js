const express = require('express')
const app = express()

app.get('/', (req,res) => {
    res.send("");
    
})

app.listen(3000, () => {
    console.log("server is listening on 3000 port");
})