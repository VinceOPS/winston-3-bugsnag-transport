import bugsnag, { Bugsnag } from '@bugsnag/js';
import * as Transport from 'winston-transport';
import * as _ from 'lodash';

type BugsnagConfig = Exclude<Parameters<typeof bugsnag>[0], string>;
type TransportConfig = ConstructorParameters<typeof Transport>[0];

type WinstonLogLevel = 'silly' | 'debug' | 'verbose' | 'info' | 'warn' | 'error';
type BugsnagLogSeverity = 'info' | 'warning' | 'error';

export type BugsnagTransportConfig = TransportConfig & { bugsnag: BugsnagConfig } & { level?: WinstonLogLevel };

const SYM_LEVEL = Symbol.for('level');
const SYM_SPLAT = Symbol.for('splat');
const SYM_MESSAGE = Symbol.for('message');

type LoggingInfo = {
  level: WinstonLogLevel;
  message?: string;
  [SYM_LEVEL]?: string;
  [SYM_SPLAT]?: unknown;
  [SYM_MESSAGE]?: unknown;
};

/**
 * Bugsnag transport for Winston v3.
 * See the README file for more instructions.
 *
 * Manual reporting in Bugsnag client:
 * https://docs.bugsnag.com/platforms/javascript/reporting-handled-errors/#sending-errors
 */
export class BugsnagTransport extends Transport {
  public readonly level?: WinstonLogLevel;
  private readonly client: Bugsnag.Client;
  private readonly logLevelToSeverity = new Map<WinstonLogLevel, BugsnagLogSeverity>([
    ['error', 'error'],
    ['warn', 'warning'],
    ['info', 'info'],
  ]);

  private readonly logLevelToPriority = new Map<WinstonLogLevel, number>([
    ['error', 0],
    ['warn', 1],
    ['info', 2],
    ['verbose', 3],
    ['debug', 4],
    ['silly', 5],
  ]);

  constructor(opts: BugsnagTransportConfig) {
    super(opts);
    this.client = bugsnag(opts.bugsnag);
  }

  getBugsnagClient() {
    return this.client;
  }

  log(info: LoggingInfo, next: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, ...meta } = info;

    if (this.silent || !this.shouldLog(level)) {
      return next();
    }

    const notifyOptions: Bugsnag.INotifyOpts = {
      severity: this.logLevelToSeverity.get(level),
    };

    // The logger has been used with an Error as a single param
    if (_.isError(info)) {
      if (info.message) {
        notifyOptions.metaData = { message: info.message };
      }

      /* Instances of Error are the favorite food of Bugsnag client, give it "as is"
      see: https://docs.bugsnag.com/platforms/javascript/reporting-handled-errors/#sending-errors */
      this.client.notify(info, notifyOptions);
      return next();
    }

    /* Filter our properties we don't want in Bugsnag
    see: https://github.com/winstonjs/winston#streams-objectmode-and-info-objects */
    notifyOptions.metaData = _.omit(meta, 'message', SYM_LEVEL, SYM_SPLAT, SYM_MESSAGE);

    this.client.notify(info.message, notifyOptions);
    return next();
  }

  /**
   * Determine whether the Transport should pass the log to Bugsnag.
   * Will pass the log if:
   * - There is no logging level defined at the Transport level (this instance)
   * - If the given `level` has a priority <= than the Transport's one
   * - If the priority of one of the two levels is undefined (shouldn't happen...)
   *
   * e.g. if `level` is set to `'error'` (0, the biggest priority (in descending order))
   * and the level of the Transport is set to `'warn'`, then the log can pass, as `0 < 1`.
   *
   * @param level Candidate logging level, compared with the level of the Transport
   *
   * @return `true` if the log should be sent to Bugsnag.
   */
  private shouldLog(level: WinstonLogLevel): boolean {
    if (!this.level) {
      return true;
    }

    const transportLevelPriority = this.logLevelToPriority.get(this.level);
    const logLevelPriority = this.logLevelToPriority.get(level);

    if (transportLevelPriority === undefined || logLevelPriority === undefined) {
      return true;
    }

    return logLevelPriority <= transportLevelPriority;
  }
}
