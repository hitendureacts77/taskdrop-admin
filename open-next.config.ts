import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Every admin page is per-user and dynamic, so no incremental cache (R2/KV) is set up:
// nothing here is cached between requests. Trial only, plan task 5.12 step 6.
export default defineCloudflareConfig({});
