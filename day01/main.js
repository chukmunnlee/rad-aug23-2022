const express = require('express')
const morgan = require('morgan')

const PORT = 3000

const app = express()

app.use(morgan("common"))

app.get('/time', (req, resp) => {
	resp.status(200)
		.type('text/plain')
		.send(`<h2>The current date is ${new Date()}</h2>`)
})

app.listen(PORT, () => {
	console.info(`Application started on port ${PORT} at ${new Date()}`)
})

