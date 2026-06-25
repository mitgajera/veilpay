/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo root also has a lockfile (it's an Anchor/SDK monorepo); pin tracing
  // to this app so Next doesn't infer the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,
  // @veilpay/sdk and Solana libs ship ESM/optional native deps; transpile + ignore polyfills.
  transpilePackages: ["@veilpay/sdk"],
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (!isServer) {
      // @arcium-hq/client + Solana libs reference Node builtins that are only hit
      // on their admin/Node paths. Stub them in the browser bundle.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        os: false,  
        crypto: false,
        stream: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
