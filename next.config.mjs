/** @type {import('next').NextConfig} */
const nextConfig = {
  // This console is for staff only -- keep it out of search indexes
  // regardless of what host it ends up deployed behind.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
