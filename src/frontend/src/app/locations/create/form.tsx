import React from "react";
import { ToastContainer, toast } from "react-toastify";
import { betterFetch } from "@/utils";
import { Controls } from "./page";

type Notification = any;

function waitForNotification(timeout: number): Promise<Notification> {
  const eventSource = new EventSource(
    "http://localhost:3001/api/notifications?stream=notifications",
  );

  const ac = new AbortController();

  eventSource.addEventListener(
    "notification",
    (msg) => {
      ac.abort(msg.data);
    },
    { once: true, signal: ac.signal },
  );

  eventSource.onerror = (event) => {
    console.error("[Eventsource] Errored", { event });
    eventSource.close();
  };

  eventSource.onopen = () => {
    console.log("[Eventsource] Opened");
  };

  console.log(
    `[Eventsource] Connecting for notifications - Closing in ${timeout}ms`,
  );

  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      console.error("[Eventsource] Reached timeout");
      reject(null);
    }, timeout);

    const abortHandler = (e: Event) => {
      const msg = (e.target! as any).reason as any;
      console.log("[Eventsource] Received message before timeout");
      clearTimeout(id);
      eventSource.close();
      ac.signal.removeEventListener("abort", abortHandler);
      resolve(msg);
    };

    ac.signal.addEventListener("abort", abortHandler);
  });
}

type CreateLocationFormProps = Pick<
  Controls,
  "appendLog" | "awaitOnServer" | "simulateTimeout" | "notificationTimeout"
>;

export function CreateLocationForm({
  appendLog,
  awaitOnServer,
  simulateTimeout,
  notificationTimeout,
}: CreateLocationFormProps): React.ReactNode {
  const categories = ["Town", "City", "County/Region", "Country", "Continent"];

  async function submitForm(formData: FormData) {
    const jsonData = JSON.stringify(Object.fromEntries(formData));
    const headers = new Headers();

    headers.set("X-Notification-Await", awaitOnServer.toString());
    headers.set("X-Notification-Timeout", notificationTimeout.toString());
    headers.set("X-Notification-Simulate-Timeout", simulateTimeout.toString());

    const res = await betterFetch<{ id: string }>(
      "http://localhost:3001/api/location/create",
      {
        method: "POST",
        body: jsonData,
        headers,
      },
    );

    if (!res.ok) {
      console.error(res.error);
      toast.error(
        <>
          Something went wrong <br />
          <b>{res.error}</b>
        </>,
      );

      return;
    }

    console.log("[Form] Response:", JSON.stringify(res.data, null, 2));
    appendLog("Form - API response", JSON.stringify(res.data, null, 2));

    if (awaitOnServer) {
      return;
    }

    console.log(`[SSE] Waiting for notification for ${notificationTimeout}s`);

    const timeoutToast = () => {
      toast.success(
        <div className="gap-y-2">
          <h2>Success!</h2>
          <p className="text-sm">
            Your resource is not ready yet, but should be available soon
          </p>
          <p className="text-sm">Location ID: {res.data.id}</p>
        </div>,
      );
    };

    if (simulateTimeout) {
      await new Promise((resolve) =>
        setTimeout(resolve, notificationTimeout * 1_000),
      );
      timeoutToast();
      return;
    }

    const notification = await waitForNotification(notificationTimeout * 1_000)
      .then((msg) => {
        const json = JSON.parse(msg);
        console.log(
          "[Eventsource] Notification: ",
          JSON.stringify(json, null, 2),
        );

        toast.success(
          <>
            <h2>Success!</h2>
          </>,
        );

        return json;
      })
      .catch(() => {
        timeoutToast();
      });

    if (notification !== undefined) {
      appendLog("SSE - Notification", JSON.stringify(notification, null, 2));
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
      />
      <div className="py-8 w-full lg:py-16">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          Add a new location
        </h2>

        <form action={submitForm}>
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <label
                htmlFor="name"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Location Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                className="bg-forminput-bg border border-forminput-border text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                placeholder="Type location name"
                required
              />
            </div>

            <div>
              <div>
                <label
                  htmlFor="category"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue=""
                  required
                  className="
                  block w-full p-2.5 
                  bg-forminput-bg border border-forminput-border 
                  text-gray.clone()-900 text-sm rounded-lg 
                  focus:ring-primary-500 focus:border-primary-500
                  dark:placeholder-gray-400 
                  dark:focus:ring-primary-500 dark:focus:border-primary-500"
                >
                  <option value="" disabled hidden>
                    Select category
                  </option>
                  {categories.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block mb-2 text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="block p-2.5 w-full text-sm bg-background
                text-gray-900 rounded-lg border border-forminput-border
                focus:ring-primary-500 focus:border-primary-500 
                dark:focus:ring-primary-500 dark:focus:border-primary-500"
                placeholder="Your description here"
              ></textarea>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center px-5 py-2.5 mt-4 sm:mt-6 text-sm font-medium text-center text-white bg-primary-700 rounded-lg focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-900 hover:bg-primary-800"
          >
            Add location
          </button>
        </form>
      </div>
    </section>
  );
}
