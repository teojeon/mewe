// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    INSTAGRAM_CLIENT_ID: string;
    INSTAGRAM_CLIENT_SECRET: string;
    INSTAGRAM_REDIRECT_URI: string;
  }
}
