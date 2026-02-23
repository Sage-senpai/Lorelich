/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better dev experience
  reactStrictMode: true,

  // Required for wagmi / viem / 0G SDK (node modules stubbed in browser)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    // Stub missing optional deps to suppress "module not found" warnings.
    // These are optional runtime deps that are never needed in this app:
    // - @react-native-async-storage/async-storage  (from @metamask/sdk → wagmi → connectkit)
    // - pino-pretty                                 (from pino → @walletconnect → wagmi → connectkit)
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      // Stub `node:` prefixed imports used by @0glabs/0g-ts-sdk (browser builds only)
      ...(!isServer && {
        "node:crypto": false,
        "node:fs": false,
        "node:fs/promises": false,
        "node:path": false,
        "node:os": false,
        "node:stream": false,
        "node:buffer": false,
      }),
    };

    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed by wagmi/viem
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https: wss:",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Limit API body size
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
