"use client";
import React, { useCallback, useState } from "react";
import { CreateLocationForm } from "./form";

type OptionsProps = Pick<
  Controls,
  | "awaitOnServer"
  | "setAwaitOnServer"
  | "notificationTimeout"
  | "setNotificationTimeout"
  | "simulateTimeout"
  | "setSimulateTimeout"
>;

function Options({
  awaitOnServer,
  setAwaitOnServer,
  notificationTimeout,
  setNotificationTimeout,
  simulateTimeout,
  setSimulateTimeout,
}: OptionsProps): React.ReactNode {
  return (
    <div className="flex flex-col gap-y-2 pt-8 lg:pt-16">
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Options
      </h2>

      <form className="flex flex-col gap-y-5">
        {/* Radio buttons */}
        <div className="flex flex-col items-start gap-y-2">
          <p>Subscribe to notification on...</p>

          <div className="flex items-center">
            <div className="flex w-10 justify-center">
              <input
                type="radio"
                id="await-on-client-radio"
                name="await-on-server-radio"
                className="
                  h-4 w-4 block p-2.5 
                  bg-gray-50 border 
                  border-forminput-border 
                  focus:ring-primary-600 focus:border-primary-600 
                  dark:focus:ring-primary-500 dark:focus:border-primary-500
                "
                defaultChecked={!awaitOnServer}
                onChange={() => setAwaitOnServer(false)}
              />
            </div>
            <label
              htmlFor="await-on-client-radio"
              className="ml-2 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              Client
            </label>
          </div>

          <div className="flex items-center">
            <div className="flex w-10 justify-center">
              <input
                type="radio"
                id="await-on-server-radio"
                name="await-on-server-radio"
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                defaultChecked={awaitOnServer}
                onChange={() => setAwaitOnServer(true)}
              />
            </div>
            <label
              htmlFor="await-on-server-radio"
              className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              Server
            </label>
          </div>
        </div>

        <div className="flex flex-col items-start gap-y-2">
          <p>Timeout</p>

          <div className="flex items-center justify-start flex-row gap-x-2">
            <div className="flex w-10 p-2 justify-center">
              <input
                type="checkbox"
                id="simulate-timeout"
                name="simulate-timeout"
                className="
                  h-5 w-5 rounded-lg block p-2.5 
                  bg-forminput-bg border border-forminput-border 
                  focus:ring-primary-600 focus:border-primary-600 
                  dark:focus:ring-primary-500 dark:focus:border-primary-500
                "
                defaultChecked={simulateTimeout}
                onChange={() => setSimulateTimeout(!simulateTimeout)}
              />
            </div>

            <label
              htmlFor="delay"
              className="text-sm text-gray-900 dark:text-gray-300"
            >
              Simulate timeout waiting for notification
            </label>
          </div>

          {/* Input */}
          <div className="flex items-center justify-start flex-row gap-x-2">
            <input
              type="text"
              id="timeout"
              name="timeout"
              className="
                w-10 p-2 block border text-sm rounded-lg text-center 
                bg-forminput-bg border-forminput-border
                dark:focus:ring-primary-500 dark:focus:border-primary-500
              "
              defaultValue={notificationTimeout}
              onChange={(ev) => setNotificationTimeout(+ev.currentTarget.value)}
            />

            <label
              htmlFor="timeout"
              className="text-sm text-gray-900 dark:text-gray-300"
            >
              Wait for notification timeout (seconds)
            </label>
          </div>
        </div>
      </form>
    </div>
  );
}

type ResponseLogProps = {
  log: LogMessage[];
};
function ResponseLog({ log }: ResponseLogProps): React.ReactNode {
  return (
    <section className="flex flex-col h-80 overflow-y-auto gap-y-2">
      <div className="flex justify-between items-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-50">
          Log
        </h2>
        <div className="text-sm pr-2">{log.length} entries</div>
      </div>

      <div className="flex w-full flex-1 flex-col rounded-lg p-3 gap-y-2 bg-forminput-bg overflow-auto">
        {log.length > 0 ? (
          log.toReversed().map(({ source, msg }, i) => {
            return (
              <div
                key={i}
                className="flex flex-col flex-1 rounded border border-border p-2 bg-background"
              >
                <div className="flex text-sm flex-shrink-0 px-2 pt-2 font-bold">
                  {source}
                </div>
                <div className="flex flex-1 p-2 overflow-x-auto">
                  <pre className="text-sm">{msg}</pre>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-gray-400 dark:text-gray-700">Nothing yet...</div>
        )}
      </div>
    </section>
  );
}

export type LogMessage = {
  source: string;
  msg: string;
};
export type Controls = {
  log: LogMessage[];
  appendLog: (source: string, msg: string) => void;
  simulateTimeout: boolean;
  setSimulateTimeout: (state: boolean) => void;
  notificationTimeout: number;
  setNotificationTimeout: (delaySeconds: number) => void;
  awaitOnServer: boolean;
  setAwaitOnServer: (state: boolean) => void;
};

export default function Home(): React.ReactNode {
  // Serious, production-ready React right here
  const [log, setLog] = useState<LogMessage[]>([]);
  const [simulateTimeout, setSimulateTimeout] = useState(false);
  const [notificationTimeout, setNotificationTimeout] = useState(1);
  const [awaitOnServer, setAwaitOnServer] = useState(false);

  const appendLog = useCallback(
    (source: string, msg: string) => {
      // Yes, this is required
      log.push({ source, msg });
      setLog([...log]);
    },
    [log],
  );

  return (
    <main className="flex flex-row px-4 max-w-screen-xl mx-auto gap-x-8">
      <CreateLocationForm
        {...{ appendLog, awaitOnServer, notificationTimeout, simulateTimeout }}
      />
      <div className="flex flex-1 overflow-x-hidden flex-col gap-y-8 pb-10">
        <Options
          {...{
            simulateTimeout,
            setSimulateTimeout,
            notificationTimeout,
            setNotificationTimeout,
            awaitOnServer,
            setAwaitOnServer,
          }}
        />
        <ResponseLog log={log} />
      </div>
    </main>
  );
}
