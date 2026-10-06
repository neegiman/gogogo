const basePath = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? '/gogogo').replace(/\/$/, '') : '';
export default {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
};
