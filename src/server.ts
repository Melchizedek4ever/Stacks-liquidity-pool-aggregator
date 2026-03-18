import "dotenv/config"
import Fastify from "fastify"
import { registerRoutes } from "./api/routes"
import { startIndexer } from "./workers/indexer"

const app = Fastify({ logger: true })

const start = async () => {
  await registerRoutes(app)
  const port = Number(process.env.PORT) || 3000

  await app.listen({ port, host: "0.0.0.0" })
  startIndexer()
}

start().catch((error) => {
  app.log.error(error)
  process.exit(1)
})
