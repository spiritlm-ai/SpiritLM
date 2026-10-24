import ky from "ky";

export const http = ky.create({
  retry: 0,
  timeout: false,
  throwHttpErrors: false,
  cache: "no-store",
});
