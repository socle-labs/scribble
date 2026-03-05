import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@scribble/auth", "@scribble/shared"],
};

export default nextConfig;
