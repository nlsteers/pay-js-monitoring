import type {Request, Response} from "express"

const express = require("express")
const metrics = require("./metrics")

const app = express()

const metricsModule = metrics(app,{
  logLevel: 'debug', // set the default log level
  prefix: 'my_app_', // prefix all metrics (custom and default) with this value
  defaultMetricsLabels: { // add these labels to all metrics
    'first': 'look how observable i am',
    'second': 'another lovely label'
  }
})

const logger = metricsModule.logger

metricsModule.registerCounter("hello_counter", "/hello example counter metric")
metricsModule.registerGauge("hello_gauge", "/hello example gauge metric")

app.get("/hello", (_: Request, res: Response) => {
  metricsModule.updateMetric("hello_counter", 1)
  metricsModule.updateMetric("fake_metric", 1) // will produce warning when metric is not registered
  metricsModule.updateMetric("hello_gauge", Math.floor(Math.random() * 100) + 1)
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ message: "hello world" }))
})

const server = app.listen(3000, () => {
  logger.info(`server started on port ${server.address().port}`)
})




