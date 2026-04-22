import { shell } from 'electron';

// @ts-expect-error electron-vite injects MAIN_VITE_ env vars into import.meta.env
const CLIENT_ID: string = import.meta.env.MAIN_VITE_GITHUB_CLIENT_ID;

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

export async function startDeviceFlow(): Promise<{
  userCode: string;
  verificationUri: string;
  deviceCode: string;
  interval: number;
}> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: 'repo',
    }),
  });

  const data = (await res.json()) as DeviceCodeResponse & { error?: string; error_description?: string };

  if (!CLIENT_ID) {
    throw new Error('MAIN_VITE_GITHUB_CLIENT_ID is not set in .env file.');
  }

  if (data.error || !data.verification_uri) {
    throw new Error(
      data.error_description || data.error || 'Failed to start device flow. Check GITHUB_CLIENT_ID.'
    );
  }

  await shell.openExternal(data.verification_uri);

  return {
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    deviceCode: data.device_code,
    interval: data.interval,
  };
}

export async function pollForToken(
  deviceCode: string,
  interval: number
): Promise<string> {
  const poll = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const res = await fetch(
            'https://github.com/login/oauth/access_token',
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                client_id: CLIENT_ID,
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              }),
            }
          );

          const data = (await res.json()) as TokenResponse;

          if (data.access_token) {
            clearInterval(timer);
            resolve(data.access_token);
          } else if (
            data.error &&
            data.error !== 'authorization_pending' &&
            data.error !== 'slow_down'
          ) {
            clearInterval(timer);
            reject(new Error(data.error));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval * 1000);
    });

  return poll();
}
