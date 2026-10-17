import express from 'express'
import * as promClient from 'prom-client'

const app = express()
const PORT = 6543

const register = new promClient.Registry()
promClient.collectDefaultMetrics({ register })

const requestCounter = new promClient.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
})

const activeConnectionsGauge = new promClient.Gauge({
  name: 'api_active_connections',
  help: 'Number of active connections',
  registers: [register],
})

const requestDurationHistogram = new promClient.Histogram({
  name: 'api_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
})

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

app.get('/healthz', (_req, res) => {
  res.sendStatus(200)
})

app.get('/api/users', (_req, res) => {
  const start = Date.now()
  activeConnectionsGauge.inc()

  setTimeout(() => {
    const duration = (Date.now() - start) / 1000
    requestDurationHistogram.labels('GET', '/api/users').observe(duration)
    requestCounter.labels('GET', '/api/users', '100').inc()
    activeConnectionsGauge.dec()

    res.status(200).json({ users: ['Alice', 'Bob', 'Charlie'] })
  }, Math.random() * 500)
})

app.get('/api/products', (_req, res) => {
  const start = Date.now()
  activeConnectionsGauge.inc()

  setTimeout(() => {
    const duration = (Date.now() - start) / 1000
    requestDurationHistogram.labels('GET', '/api/products').observe(duration)
    activeConnectionsGauge.dec()

    if (Math.random() < 0.2) {
      requestCounter.labels('GET', '/api/products', '500').inc()
      return res.status(500).json({ error: 'Internal Server Error' })
    }

    requestCounter.labels('GET', '/api/products', '200').inc()
    res.status(200).json({ products: ['Laptop', 'Phone', 'Tablet'] })
  }, Math.random() * 1000)
})

app.listen(PORT, () => console.log('app is listening on port:', PORT))
