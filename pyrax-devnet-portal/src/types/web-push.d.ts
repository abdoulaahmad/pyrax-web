// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Minimal ambient declaration for the `web-push` package (which ships no bundled types and for which
// we deliberately don't pull in @types/web-push). Covers only the surface src/server/push.ts uses.
declare module "web-push" {
  export interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string } | Record<string, string>;
  }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;
  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default _default;
}
