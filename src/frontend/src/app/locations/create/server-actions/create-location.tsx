"use server";

import { betterFetch } from "@/utils";
import { revalidateTag } from "next/cache";

type CreateLocationOpts = {
  delaySeconds: number;
};
export async function server_createLocation(
  { delaySeconds }: CreateLocationOpts,
  formData: FormData,
) {
  // TODO: Validation
  const jsonData = JSON.stringify(Object.fromEntries(formData));
  console.log("Creating location", jsonData);
  const res = await betterFetch<{ id: string }>(
    "http://localhost:3001/api/location/create",
    {
      method: "POST",
      body: jsonData,
    },
  );

  if (res.ok) {
    console.log("Request OK; invalidating locations cache");
    revalidateTag("locations");
  } else {
    console.error(res.error);
  }
  return res;
}
