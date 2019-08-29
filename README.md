# Winston 3 Bugsnag Transport

[Bugsnag](https://github.com/bugsnag/bugsnag-js) transport for the logger [Winston](https://github.com/winstonjs/winston) (v3+).  
Relies on the official client [@bugsnag/js](https://github.com/bugsnag/bugsnag-js).  

⚠ `esModuleInterop` is required in your `tsconfig` in order for this project to be imported.

## Getting started

```bash
yarn add winston-3-bugsnag-transport
# or
npm install --save winston-3-bugsnag-transport
```

## How to

Create a winston logger and pass a new instance of `BugsnagTransport` to it. The constructor accepts any property from the default configuration of Winston `Transport`s and an additional property `bugsnag` taking a [configuration](https://docs.bugsnag.com/platforms/javascript/configuration-options/) for the bugsnag client (`@bugsnag/js`, as of v6.3+).

```typescript
import winston from 'winston';
import { BugsnagTransport } from 'winston-3-bugsnag-transport';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new BugsnagTransport({ bugsnag: { apiKey: 'API_KEY' } })],
});

// use your logger 🎉
```

## Details of implementation

### Severity

**Bugsnag** has a "[Severity](https://www.bugsnag.com/blog/severity)" feature which allows tagging errors as either _error_, _warning_ or _info_. **Winston** has "[Logging levels](https://github.com/winstonjs/winston#logging-levels)".  
A mapping is made between Severity "info", "warning", "error" and Logging levels "info", "warn", "error". This is not something customizable **at the present time** but PRs are most welcome if you need to.

### Logging recommendations

- Logging levels have an importance, chose them carefully. Most of the time:
  - `error` should be used for critical situations requiring a manual intervention
  - `warn` is for unsual circumstances (to be reported!) that the application can recover from
  - `info` can report anything useful: events, state changes, etc
- Put all the useful details about the context/state of your application in the `metadata` of your logs (easy debugging, filtering, etc)
- Consider [**Structured logging**](https://channel9.msdn.com/Events/Build/2013/3-336) for even more useful/powerful logs (_see [what](https://docs.bugsnag.com/platforms/javascript/reporting-handled-errors/#customizing-diagnostic-data) Bugsnag can do_)

There are multiple ways to notify an error (or an event) to Bugsnag

- **Embedding an `Error` in log metadata** (recommended)

```typescript
try {
  // ...
} catch (error) {
  logger.warn('Thumbnail creation failed: original picture will be used', {
    error, // report "error" as-is in the metadata
    feature: 'picture-thumbnail',
    path: filePath,
    size: fileSize,
  });
}
```

The parameter `meta` of `winston` is passed as the `metaData` of `@bugsnag/js`. This way, in the Bugsnag dashboard, every scalar values are available in the "Custom" tab of the report, and each object (or error) has its own tab.

- But it is also possible to report an error directly:

```typescript
try {
  // ...
} catch (error) {
  logger.warn(error);
}
```

The `message` and `stack` of the error will be notified to Bugsnag.

- Or by passing the error as meta (discouraged!)

```typescript
try {
  // ...
} catch (error) {
  logger.warn('Thumbnail creation failed: original picture will be used', error);
}
```
