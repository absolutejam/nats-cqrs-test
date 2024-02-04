"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CreateLocationForm } from "./form";

type OptionsProps = {
  delaySeconds: number;
};
function Options({ delaySeconds }: OptionsProps): React.ReactNode {
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
            // value=""
            name="default-radio"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
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
            // checked
            id="default-radio-2"
            type="radio"
            // value=""
            name="default-radio"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
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
      <div className="flex flex-row gap-x-2">
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
            defaultValue={delaySeconds}
          />
        </div>
      </div>
    </div>
  );
}

type ResponseLogProps = {
  log: { source: string; msg: string }[];
};
function ResponseLog({ log }: ResponseLogProps): React.ReactNode {
  return (
    <section className="flex flex-col h-80 overflow-y-auto gap-y-2">
      <div className="flex justify-between items-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Log
        </h2>
        <div className="text-sm pr-2">{log.length} entries</div>
      </div>

      <div className="flex w-full flex-1 flex-col rounded-lg p-3 gap-y-2 border-gray-200 bg-gray-50 dark:bg-gray-950 overflow-auto">
        {log.length > 0 ? (
          log.toReversed().map(({ source, msg }, i) => {
            return (
              <div
                key={i}
                className="flex flex-col flex-1 rounded border border:gray-200 p-2 bg-white dark:bg-black "
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

type ResponseState = "error" | "success" | undefined;

export type Controls = {
  log: { source: string; msg: string }[];
  appendLog: (source: string, msg: string) => void;
  shouldSubscribeSSE: boolean;
  setDelay: (delaySeconds: number) => void;
  delaySeconds: number;
  setNotificationTimeout: (delaySeconds: number) => void;
  notificationTimeout: number;
  setResponseState: (state: ResponseState) => void;
};

export default function Home(): React.ReactNode {
  // Serious, production-ready React right here
  const [log, setLog] = useState<{ source: string; msg: string }[]>([]);
  const [shouldSubscribeSSE, setShouldSubscribeSSE] = useState<boolean>(false);
  const [delaySeconds, setDelay] = useState<number>(0);
  const [notificationTimeout, setNotificationTimeout] = useState<number>(1_000);
  const [responseState, setResponseState] = useState<ResponseState>(undefined);

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
      <CreateLocationForm appendLog={appendLog} />
      <div className="flex flex-1 overflow-x-hidden flex-col gap-y-8 pb-10">
        <Options delaySeconds={delaySeconds} />
        <ResponseLog log={log} />
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
