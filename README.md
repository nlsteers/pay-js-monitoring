## Common Metrics Module Spike

A small node module that can be included with any `express` application.

The module will automatically instrument an existing app with default node metrics in `prometheus` scrape-able format and expose a `/metrics` endpoint.

Custom metrics can be added using the `register<Counter|Gauge|Histogram>(name, help)` method and updated via the `updateMetric(metricName, value)` method.

Additionally, this module provides a preconfigured `winston` logger.

### Running the example app

`npm start` will build and start an example express app with some custom metrics defined, go to `localhost:3000/hello` to see the metrics update on `localhost:3000/metrics`.

`npm start:watch` will automatically restart the server if any changes are made to the files in the `src` directory.
