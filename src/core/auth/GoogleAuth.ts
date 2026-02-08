import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import open from 'open';

// Scopes for Profile and Email
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor(clientId: string, clientSecret: string) {
    this.client = new OAuth2Client(
      clientId,
      clientSecret,
      'http://localhost:3000/oauth2callback',
    );
  }

  /**
   * Start the OAuth flow.
   * For CLI, we can either:
   * 1. Spin up a local server to catch the callback (Better DX)
   * 2. Ask user to paste code (Easier impl if ports blocked)
   *
   * We'll try the Local Server approach (like gcloud).
   */
  async login(): Promise<any> {
    return new Promise((resolve, reject) => {
      // 1. Create local server
      const server = http
        .createServer(async (req, res) => {
          try {
            if (req.url!.indexOf('/oauth2callback') > -1) {
              const qs = new url.URL(req.url!, 'http://localhost:3000')
                .searchParams;
              const code = qs.get('code');
              res.end('Authentication successful! You can close this window.');
              server.close();

              if (code) {
                // 2. Exchange code for tokens
                const { tokens } = await this.client.getToken(code);
                this.client.setCredentials(tokens);

                // 3. Get User Info
                const userInfo = await this.client.request({
                  url: 'https://www.googleapis.com/oauth2/v1/userinfo',
                });

                resolve(userInfo.data);
              }
            }
          } catch (e) {
            reject(e);
          }
        })
        .listen(3000, async () => {
          // 4. Open Browser
          const authorizeUrl = this.client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
          });
          console.log('Opening browser for authentication...');
          await open(authorizeUrl);
        });
    });
  }

  /**
   * Manual Code Entry Fallback (if port 3000 is blocked)
   */
  async loginManual(): Promise<any> {
    const client = new OAuth2Client(
      this.client._clientId,
      this.client._clientSecret,
      'urn:ietf:wg:oauth:2.0:oob',
    );

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('Authorize this app by visiting this url:', authorizeUrl);
    return authorizeUrl; // Caller must prompt for code
  }

  async exchangeCode(code: string): Promise<any> {
    const client = new OAuth2Client(
      this.client._clientId,
      this.client._clientSecret,
      'urn:ietf:wg:oauth:2.0:oob',
    );
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const userInfo = await client.request({
      url: 'https://www.googleapis.com/oauth2/v1/userinfo',
    });
    return userInfo.data;
  }
}
