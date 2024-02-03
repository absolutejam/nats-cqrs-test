"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CreateLocationForm } from "./form";

function Options({
  setDelay,
  setNotificationTimeout,
  delaySeconds,
}: Controls): React.ReactNode {
  return (
    <div className="flex flex-col gap-y-2 pt-8 lg:pt-16">
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Options
      </h2>

      {/* Radio buttons */}
      <div className="flex flex-col items-start gap-y-2 mb-2">
        <div className="flex items-center px-2">
          <input
            id="default-radio-1"
            type="radio"
            value=""
            name="default-radio"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            onChange={() => {
              /* TODO */
            }}
          />
          <label
            htmlFor="default-radio-1"
            className="ml-2 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Subscribe to notifications after sending request
          </label>
        </div>

        <div className="flex items-center px-2">
          <input
            checked
            id="default-radio-2"
            type="radio"
            value=""
            name="default-radio"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            onChange={() => {
              /* TODO */
            }}
          />
          <label
            htmlFor="default-radio-2"
            className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Checked state
          </label>
        </div>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-y-2 w-80">
        <div className="flex flex-row flex-wrap gap-y-2">
          <label
            htmlFor="default-radio-1"
            className="text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Server-side processing delay (ms)
          </label>

          <input
            type="text"
            name="name"
            id="name"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            defaultValue={delaySeconds}
            itemType="number"
          />
        </div>

        {/* Input */}
        <div className="flex flex-row flex-wrap gap-y-2">
          <label
            htmlFor="default-radio-1"
            className="text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Notification timeout (ms)
          </label>

          <input
            type="text"
            name="name"
            id="name"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
            value={delaySeconds}
            onChange={() => {
              /* TODO */
            }}
          />
        </div>
      </div>
    </div>
  );
}

export type Controls = {
  log: string[];
  appendLog: (source: string, message: string) => void;
  shouldSubscribeSSE: boolean;
  setDelay: (delaySeconds: number) => void;
  delaySeconds: number;
  setNotificationTimeout: (delaySeconds: number) => void;
  notificationTimeout: number;
};

export default function Home(): React.ReactNode {
  // Serious, production-ready React right here
  const [log, setLog] = useState<string[]>([]);
  const [shouldSubscribeSSE, setShouldSubscribeSSE] = useState<boolean>(false);
  const [delaySeconds, setDelay] = useState<number>(0);
  const [notificationTimeout, setNotificationTimeout] = useState<number>(1_000);

  const appendLog = useCallback(
    (source: string, msg: string) => {
      setLog([`${source}: ${msg}`, ...log]);
    },
    [setLog, log],
  );

  const controls: Controls = {
    log,
    appendLog,
    shouldSubscribeSSE,
    setNotificationTimeout,
    notificationTimeout,
    setDelay,
    delaySeconds,
  };

  return (
    <main className="flex flex-row px-4 max-w-screen-xl mx-auto gap-x-8">
      <CreateLocationForm controls={controls} />
      <div className="flex flex-1 overflow-x-hidden flex-col gap-y-8">
        <Options {...controls} />
      </div>
    </main>
  );
}

// useEventSourceTicker(es, { intervalMs }, (es) => {
//   switch (es.readyState) {
//     case 0:
//       console.log("[Tick] ES connecting");
//       break;
//
//     case 1:
//       console.log("[Tick] ES connected");
//       break;
//
//     case 2:
//       console.log("[Tick] ES disconnected");
//       break;
//
//     default:
//       break;
//   }
// });

type UseEventSourceTickerOpts = {
  intervalMs?: number;
  deps?: any[];
};

function useEventSourceTicker(
  eventSource: EventSource,
  opts: UseEventSourceTickerOpts = {},
  handler: (eventSource: EventSource) => void,
) {
  useEffect(() => {
    const id = setInterval(() => {
      handler(eventSource);
    }, opts.intervalMs || 1_000);

    return () => {
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSource, ...(opts.deps || [])]);
}
