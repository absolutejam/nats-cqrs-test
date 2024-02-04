import { betterFetch } from "@/utils";
import React from "react";

type Location = {
  id: string;
  name: string;
  category: string;
  description: string;
  created_at: string;
};

function TableRow({
  location: { id, name, category, description, created_at: createdAt },
}: {
  key: string;
  location: Location;
}): React.ReactNode {
  return (
    <tr className="border-b border-border">
      <th
        scope="row"
        className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white"
      >
        {name}
      </th>
      <td className="px-4 py-3">{category}</td>
      <td className="px-4 py-3">{description}</td>
      <td className="px-4 py-3">{createdAt}</td>
    </tr>
  );
}

async function getLocations(): Promise<Location[]> {
  const res = await betterFetch<Location[]>(`http://localhost:3000/location`, {
    next: { tags: ["locations"] },
  });
  if (!res.ok) {
    console.log("Failed to fetch locations", { error: res.error });
    return [];
  }

  console.log(`Got ${res.data.length} locations`);
  return res.data;
}

function NoResults(): React.ReactNode {
  return (
    <div className="flex p-20 justify-center">
      <span className="text-2xl font-black">No results</span>
    </div>
  );
}

function ResultsTable({
  children,
  count,
}: Readonly<{ count: number; children: React.ReactNode }>): React.ReactNode {
  return (
    <div className="bg-background relative overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 pt-4 pb-2">
                Location name
              </th>
              <th scope="col" className="px-4 pt-4 pb-2">
                Category
              </th>
              <th scope="col" className="px-4 pt-4 pb-2">
                Description
              </th>
              <th scope="col" className="px-4 pt-4 pb-2">
                Created
              </th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <nav
        className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
        aria-label="Table navigation"
      >
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Showing
          <span className="font-semibold text-gray-900 dark:text-white px-1">
            {count}
          </span>
          locations
        </span>
      </nav>
    </div>
  );
}

export default async function Home(): Promise<React.ReactElement> {
  const locations = await getLocations();

  return (
    <main className="flex flex-col px-4 max-w-screen-xl mx-auto">
      <section className="py-6">
        {locations.length == 0 ? (
          <NoResults />
        ) : (
          <ResultsTable count={locations.length}>
            {locations.map((location) => (
              <TableRow key={location.name} location={location} />
            ))}
          </ResultsTable>
        )}
      </section>
    </main>
  );
}
