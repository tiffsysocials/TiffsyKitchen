const TEST_BASE_URL = 'https://tiffsy-backend-8ecm.onrender.com';
const PROD_BASE_URL = 'https://d31od4t2t5epcb.cloudfront.net';

// Set to true to force the test URL even in release builds.
// Revert to false before producing a real production build for the Play Store / AWS.
const FORCE_TEST_URL = false;

// Set to true to force the production (AWS CloudFront) URL even in dev/debug builds.
// Revert to false to go back to the test backend during local development.
const FORCE_PROD_URL = true;

export const BASE_URL = FORCE_PROD_URL
  ? PROD_BASE_URL
  : __DEV__ || FORCE_TEST_URL
  ? TEST_BASE_URL
  : PROD_BASE_URL;
