"use client";

import React from "react";
import { ToastContainer, toast } from "react-toastify";
import { server_createLocation } from "./server-actions/create-location";
import { Controls } from "./page";

type CreateLocationFormProps = {
  controls: Controls;
};

export function CreateLocationForm({
  controls,
}: CreateLocationFormProps): React.ReactNode {
  const categories = ["Town", "City", "County/Region", "Country", "Continent"];
  async function submitForm(formData: FormData) {
    const res = await server_createLocation(formData);

    if (!res.ok) {
      toast.error("Something went wrong");
      controls.setResponseState("error");
      return;
    }

    controls.appendLog(JSON.stringify(res.data));
    controls.setResponseState("success");
    toast.success("Success!");
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
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
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
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
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
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={8}
                className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:bg-black dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
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
