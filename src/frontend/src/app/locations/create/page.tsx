"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CreateLocationForm } from "./form";

function ResponseLog({ log }: { log: string[] }): React.ReactNode {
  return (
    <section className="flex flex-1 p-8">
      <pre
        className={
          (log.length > 0 ? "" : "text-gray-500 dark:text-gray-600 italic") +
          "flex flex-1 rounded-lg border-gray-200 bg-gray-50 p-3"
        }
      >
        {log.length > 0 ? log.join("\n") : "No response"}
      </pre>
    </section>
  );
}

type ResponseState = "error" | "success" | undefined;

export type Controls = {
  appendLog: (message: string) => void;
  shouldSubscribeSSE: boolean;
  setResponseState: (state: ResponseState) => void;
};

export default function Home(): React.ReactNode {
  // Serious production-worth React right here
  const [log, setLog] = useState<string[]>([]);
  const [shouldSubscribeSSE, setShouldSubscribeSSE] = useState<boolean>(false);
  const [responseState, setResponseState] = useState<ResponseState>(undefined);
  const [eventSource, setEventSource] = useState<EventSource | undefined>(
    undefined,
  );

  const appendLog = useCallback(
    (msg: string) => {
      const newLog = [msg, ...log];
      setLog(newLog);
    },
    [setLog, log],
  );

  const controls: Controls = {
    appendLog,
    shouldSubscribeSSE,
    setResponseState,
  };

  useEffect(() => {
    if (eventSource != undefined) {
      const id = setInterval(() => {
        switch (eventSource.readyState) {
          case 0:
            console.log("[Tick] ES connecting");
            break;

          case 1:
            console.log("[Tick] ES connected");
            break;

          case 2:
            console.log("[Tick] ES disconnected");
            break;

          default:
            break;
        }
      }, 3_000);

      return () => {
        clearInterval(id);
      };
    }
  }, [eventSource, log]);

  useEffect(() => {
    if (responseState == "success" && eventSource == undefined) {
      try {
        const eventSource = new EventSource(
          "http://localhost:3001/api/notifications?stream=notifications",
        );
        setEventSource(eventSource);

        eventSource.addEventListener(
          "notification",
          (msg) => {
            const json = JSON.parse(msg.data);
            appendLog(JSON.stringify(json, null, 2));
          },
          false,
        );

        eventSource.onerror = () => {
          appendLog("Eventsource error");
          console.error("Eventsource error");
          eventSource.close();
        };

        eventSource.onopen = () => {
          appendLog("Opened SSE eventsource");
          console.log("Opened SSE eventSource");
        };

        return () => {
          eventSource.close();
          setEventSource(undefined);
        };
      } catch {
        setEventSource(undefined);
        appendLog("Failed to connect to eventsource");
        console.error("Failed to connect to eventsource");
      }
    }
  }, [responseState, log]);

  return (
    <main className="flex flex-row px-4 max-w-screen-xl mx-auto gap-x-4">
      <CreateLocationForm controls={controls} />
      <ResponseLog log={log} />
    </main>
  );
}
