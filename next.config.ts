import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing CDN hosts — `file.ufsUrl` (v7) resolves to *.ufs.sh.
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      // Placeholder food photography until the client's shoot lands.
      // REMOVE once real assets are uploaded to UploadThing.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Next 16 requires an explicit allowlist; unlisted values 400 at the
    // optimizer. 90 is here for the full-bleed hero, which bands at 75.
    qualities: [75, 90],
  },
};

export default nextConfig;
