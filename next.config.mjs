import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Source file for the service worker
  swSrc: "src/app/sw.ts",

  // Output location (goes into public/)
  swDest: "public/sw.js",

  // Cache pages as the user navigates
  cacheOnNavigation: true,

  // Reload when coming back online
  reloadOnOnline: true,

  // Don't run service worker in dev (avoids caching headaches)
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
