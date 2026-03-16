import { FastifyInstance } from "fastify"
import { toPoolResponse, toRankedPoolResponse } from "./serializers"
import { getAllPools, getBestPools, getPoolsByDex, getTopPools } from "../services/poolService"
import { listTokens } from "../services/tokenRegistry"

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/pools", async (_request, reply) => {
    try {
      const pools = await getAllPools()
      return pools.map(toPoolResponse)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: "Failed to fetch pools" })
    }
  })

  app.get("/pools/top", async (_request, reply) => {
    try {
      const pools = await getTopPools(10)
      return pools.map(toPoolResponse)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: "Failed to fetch top pools" })
    }
  })

  app.get("/pools/best", async (_request, reply) => {
    try {
      const pools = await getBestPools()
      return pools.map(toRankedPoolResponse)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: "Failed to fetch ranked pools" })
    }
  })

  app.get<{ Params: { dex: string } }>("/pools/:dex", async (request, reply) => {
    try {
      const pools = await getPoolsByDex(request.params.dex)
      return pools.map(toPoolResponse)
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: "Failed to fetch pools for dex" })
    }
  })

  app.get("/tokens", async (_request, reply) => {
    try {
      const tokens = await listTokens()
      return tokens.map((token) => ({ symbol: token.symbol, name: token.name }))
    } catch (error) {
      app.log.error(error)
      return reply.code(500).send({ error: "Failed to fetch tokens" })
    }
  })
}
