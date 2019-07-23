const mockedClient = { notify: jest.fn() };
const mockBugsnag = jest.fn().mockReturnValue(mockedClient);
jest.mock('@bugsnag/js', () => mockBugsnag);

import bugsnag from '@bugsnag/js';
import winston from 'winston';
import Transport from 'winston-transport';

import { BugsnagTransport, BugsnagTransportConfig } from './bugsnag-transport';

describe('BugsnagTransport', () => {
  const apiKey = 'My-Fake-Key';

  it('extends Transport (exported bywinston-transport)', () => {
    const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
    expect(bugsnagTransport).toBeInstanceOf(Transport);
  });

  describe('constructor', () => {
    it('passes custom options to the bugsnag client', () => {
      const opts: BugsnagTransportConfig = {
        bugsnag: { apiKey: 'f4bcfeefa7a667fe34a0b93346178e97', appVersion: '1.0.0' },
        level: 'info',
      };
      new BugsnagTransport(opts);

      expect(bugsnag).toHaveBeenCalledWith(opts.bugsnag);
    });
  });

  describe('getBugsnagClient', () => {
    it('returns the instantiated bugsnag client', () => {
      const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
      const client = bugsnagTransport.getBugsnagClient();
      expect(client).toBe(mockedClient);
    });
  });

  describe('Implementation of "log"', () => {
    let createLogger: (opts: winston.LoggerOptions, bt: BugsnagTransport) => winston.Logger;

    beforeAll(() => {
      createLogger = (opts, bt) =>
        winston.createLogger({
          ...opts,
          transports: [bt],
        });
    });

    beforeEach(() => {
      mockedClient.notify.mockReset();
    });

    describe('Cases where Bugsnag is not used...', () => {
      it('does not use bugsnag if the Transport is "silent"', () => {
        const bugsnagTransport = new BugsnagTransport({ silent: true, bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        logger.info('Hello world');
        expect(mockedClient.notify).not.toHaveBeenCalled();
      });

      it('does not use bugsnag if the Transport "level" is set and the log level is too low', () => {
        const bugsnagTransport = new BugsnagTransport({ level: 'error', bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        logger.info('Hello world');
        expect(mockedClient.notify).not.toHaveBeenCalled();
      });

      // opinionated - ensure the configurations from the logger itself is never overridden
      it('does not use bugsnag if the Logger is "silent"', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({ silent: true }, bugsnagTransport);

        logger.error('[Error] Connection with Database could not be recovered');
        expect(mockedClient.notify).not.toHaveBeenCalled();
      });

      // opinionated - ensure the configurations from the logger itself is never overridden
      it('does not use bugsnag if the Logger "level" is set and the log level is too low', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({ level: 'warn' }, bugsnagTransport);

        logger.info('Application started');
        expect(mockedClient.notify).not.toHaveBeenCalled();
      });
    });

    describe('Cases where Bugsnag is used', () => {
      it('passes the error given as "info object" as-is to bugsnag client', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        const errorMessage = 'Do not cross the streams!';
        const anyError = new Error(errorMessage);
        logger.warn(anyError);

        expect(mockedClient.notify).toHaveBeenCalledWith(anyError, {
          severity: 'warning',
          metaData: { message: errorMessage },
        });
      });

      it('passes the stack of the Error given as winston "meta" in bugsnag "metaData"', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        const anyError = new Error('Do not cross the streams!');
        const customMessage = 'Something went wrong?';
        logger.error(customMessage, anyError);

        // winston concatenates the log message with any prop "message" from its "meta" object
        const message = `${customMessage}${anyError.message}`;

        expect(mockedClient.notify).toHaveBeenCalledWith(message, {
          severity: 'error',
          metaData: { stack: anyError.stack },
        });
      });

      it('passes the given message and metadata to bugsnag', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        const metaData = { age: 42, name: 'Not Today', error: new Error('Too young!') };
        const message = 'Hello World';
        logger.info(message, metaData);

        expect(mockedClient.notify).toHaveBeenCalledWith(message, {
          metaData,
          severity: 'info',
        });
      });

      it('accepts arrays as winston "meta" object', () => {
        const bugsnagTransport = new BugsnagTransport({ bugsnag: { apiKey } });
        const logger = createLogger({}, bugsnagTransport);

        const metaData = ['Two plus two', { is: 4 }, ['Quick', 'Maths']];
        const message = 'Hello World';
        logger.error(message, metaData);

        expect(mockedClient.notify).toHaveBeenCalledWith(message, {
          metaData: {
            0: metaData[0],
            1: metaData[1],
            2: metaData[2],
          },
          severity: 'error',
        });
      });
    });
  });
});
