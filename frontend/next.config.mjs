/** @type {import("next").NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/auth/sign-in",
        permanent: false,
      },
      {
        source: "/login/:path*",
        destination: "/auth/sign-in",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: ""
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: ""
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
        port: ""
      }
    ]
  }
};

export default nextConfig;
