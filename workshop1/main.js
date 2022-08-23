import express from 'express'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

// hack 
import range from './node_modules/express-range/index.js'

import { 
	findAllGames, findGamesByName, findGameById, countGames, 
	findCommentsByGameId, findCommentsByUser, findCommentById,
	insertComment
} from './database.js'
import { mkGameUrl, mkCommentUrl, mkError } from './util.js'

const PORT = parseInt(process.env.PORT) || 3000

const app = express()

app.use(morgan("common"))

// Games
// TODO GET /games?limit=10&offset=0
app.get("/games", async (req, resp) => {

	// Look for the query param call limit, if it exists convert to int
	// Otherwise use 10 as the defautl
	const limit = parseInt(req.query.limit) || 10
	const offset = parseInt(req.query.offset) || 0

	// SQL: select id from games offset m limit n
	// result is an array of games
	const games = await findAllGames(offset, limit)
	const result = []
	// Loop through the result and get the id
	for (const g of games) {
		result.push(`/game/${g.id}`)
	}

	// 200 OK
	resp.status(200)
	// Content-Type: application/json
	resp.type('application/json')
	resp.set("X-My-Name", "fred")
	// This is the payload
	resp.json(result)
})

// TODO GET /game/<game_id>
// alternative GET /game?gameId=<game_id>
app.get('/game/:gameId', async (req, resp) => {

	// Extract the gameId from the resource name
	const gameId = req.params.gameId
	// Find the gameId from the database
	const result = await findGameById(gameId)

	resp.type('application/json')

	// If cannot find game with the gameId
	if (!result) {
		resp.status(404)
		resp.json({ error: `Cannot find game with gameId ${gameId}` })
		return
	}

	// Return the result
	resp.status(200)
	resp.json(result)
})

app.get('/games/search', async (req, resp) => {
	const q = req.query.q
	if (!q) 
		return resp.status(400).json({ error: `Missing query parameter q` })
	
	try {
		const result = await findGamesByName(q)
		resp.status(200)
		resp.json(mkGameUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/games/count', async (req, resp) => {
	try {
		const result = await countGames()
		resp.status(200)
		resp.json({ count: result })
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})


// Comments
// TODO POST /comment
app.post('/comment', express.json(), async (req, resp) => {
	const payload = req.body

	resp.type('application/json')

	// Check if the payload as all the required fields
	for (const field of [ 'user', 'rating', 'c_text', 'gid' ])
		if (!payload[field]) {
			resp.status(400)
			resp.json(mkError(`Missing ${field} property` ))
			return 
		}

	// Check if the rating is in the valid range, between 1 and 10
	if ((payload.rating < 1) || (payload.rating > 10)) {
		resp.status(400)
		resp.json(mkError(`Valid rating range is between 1 and 10 (inclusive)`))
		return 
	}

	// Find the game by the id. Cannot comment on the game if the game
	// does not exists
	const game = await findGameById(payload.gid)
	if (!game)  {
		resp.status(400)
		resp.json(mkError(`Cannot find game id ${payload.gid}`))
		return 
	}

	// Insert the comment into the database. After inserting
	// will get the comment's new id
	const id = await insertComment(payload)
	// Return the new comment id to the user
	return resp.status(200).json({ id })
})

app.get('/game/:gameId/comments', async (req, resp) => {
	const gameId = parseInt(req.params.gameId)
	const offset = parseInt(req.query.offset) || 0
	const limit = parseInt(req.query.limit) || 10
	try {
		const result = await findCommentsByGameId(gameId, offset, limit)
		resp.status(200)
		resp.json(mkCommentUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/comments/:user', async (req, resp) => {
	const user = req.params.user
	const offset = parseInt(req.query.offset) || 0
	const limit = parseInt(req.query.limit) || 10
	try {
		const result = await findCommentsByUser(user, offset, limit)
		resp.status(200)
		resp.json(mkCommentUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/comment/:commentId', async (req, resp) => {
	const commentId = req.params.commentId
	try {
		const comment = await findCommentById(commentId)
		if (!comment) {
			resp.status(404)
			return resp.json(mkError({ error: `Comment ${commentId} not found`}))
		}
		resp.status(200)
		resp.json(comment)
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.listen(PORT, () => {
	console.info(`Application started on port ${PORT} at ${new Date()}`)
})
