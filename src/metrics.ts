const winston = require("winston")
const prometheus = require("prom-client")

import type {Request, Response, NextFunction, Express} from "express"
import type {Gauge, Counter, Histogram} from "prom-client"
import type {Logger} from "winston"

interface IConfigurationOptions {
  logLevel: string
  prefix: string
  defaultMetricsLabels: {
    [key: string]: [value: string]
  }
}

interface ICustomMetrics {
  [name: string]: Gauge | Counter | Histogram
}

module.exports = (app: Express, options: IConfigurationOptions) => {
  const metricsRegistry = new prometheus.Registry()
  const prefix = options.prefix || ''
  const defaultMetricsLabels = options.defaultMetricsLabels || {'':''}

  metricsRegistry.setDefaultLabels(defaultMetricsLabels)

  prometheus.collectDefaultMetrics({ prefix, register: metricsRegistry }) // instrument default node metrics

  const logger = winston.createLogger({
    level: options.logLevel || 'info',
    colorize: true,
    format: winston.format.combine(
      winston.format.colorize({
        colors: {
          error: 'red',
          warn: 'yellow',
          info: 'cyan',
          debug: 'green'
        }
      }),
      winston.format.simple()
    ),
    transports: [new winston.transports.Console()],
  })

  app.use((req: Request, _: Response, next: NextFunction) => {
    logger.info(`[${req.method}] ${req.url}`)
    next();
  })

  app.get('/metrics', async (_: Request, res: Response) => {
    res.set('Content-Type', metricsRegistry.contentType)
    res.end(await metricsRegistry.metrics())
  })

  app.get("/jsonmetrics", async (_: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(await metricsRegistry.getMetricsAsJSON()))
  })

  const customMetrics: ICustomMetrics = {}

  const registerCounter = (name: string, help: string) => {
    customMetrics[name] = new prometheus.Counter({
      name: `${prefix}${name}`,
      help,
      registers: [metricsRegistry],
    })
    logger.info(`${name} counter registered`)
  }

  const registerGauge = (name: string, help: string) => {
    customMetrics[name] = new prometheus.Gauge({
      name: `${prefix}${name}`,
      help,
      registers: [metricsRegistry],
    })
    logger.info(`${name} gauge registered`)
  }

  const registerHistogram = (name: string, help: string, buckets: number[]) => {
    customMetrics[name] = new prometheus.Histogram({
      name: `${prefix}${name}`,
      help,
      registers: [metricsRegistry],
      buckets
    })
    logger.info(`${name} histogram registered`)
  }

  const updateMetric = (name: string, value: number) => {
    const metric = customMetrics[name];
    if (metric) {
      if (metric instanceof prometheus.Gauge) {
        (metric as Gauge<string>).set(value)
      } else if (metric instanceof prometheus.Counter) {
        (metric as Counter<string>).inc(value)
      } else if (metric instanceof prometheus.Histogram) {
        (metric as Histogram<string>).observe(value)
      }
    } else {
      logger.warn(`metric '${name}' is not registered`);
    }
  }

  logExpressRoutes(app, logger)

  return {
    logger,
    registerCounter,
    registerGauge,
    registerHistogram,
    updateMetric
  }
}

const logExpressRoutes = (app: Express, logger: Logger) => {
  logger.debug("added new routes")
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      logger.debug(`${Object.keys(middleware.route.methods)} -> ${middleware.route.path}`)
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler: any) => {
        logger.debug(`${Object.keys(handler.route.methods)} -> ${middleware.regexp}${handler.route.path}`);
      })
    }
  })
}
