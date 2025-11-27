// Speckle Realtime Client for subscribing to stream updates
// Uses GraphQL subscriptions for real-time commit notifications

export class SpeckleRealtimeClient {
  private serverUrl: string;
  private token: string;
  private streamId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastCommitId: string | null = null;

  constructor(serverUrl: string, token: string) {
    this.serverUrl = serverUrl;
    this.token = token;
  }

  public async subscribeToStream(
    streamId: string,
    onCommitCreated: (commit: unknown) => void
  ) {
    this.streamId = streamId;

    // Get initial latest commit
    const latestCommit = await this.fetchLatestCommit(streamId);
    if (latestCommit) {
      this.lastCommitId = latestCommit.id;
    }

    // Poll for new commits (WebSocket subscriptions require more complex setup)
    this.pollingInterval = setInterval(async () => {
      try {
        const commit = await this.fetchLatestCommit(streamId);
        if (commit && commit.id !== this.lastCommitId) {
          this.lastCommitId = commit.id;
          onCommitCreated(commit);
        }
      } catch (err) {
        console.warn('Error polling for commits:', err);
      }
    }, 10000); // Poll every 10 seconds
  }

  private async fetchLatestCommit(streamId: string): Promise<{ id: string; message?: string; authorName?: string } | null> {
    try {
      const response = await fetch(`${this.serverUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query Stream($streamId: String!) {
              stream(id: $streamId) {
                commits(limit: 1) {
                  items {
                    id
                    message
                    authorName
                  }
                }
              }
            }
          `,
          variables: { streamId },
        }),
      });

      const result = await response.json();
      return result.data?.stream?.commits?.items?.[0] || null;
    } catch (err) {
      console.error('Failed to fetch latest commit:', err);
      return null;
    }
  }

  public dispose() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.streamId = null;
    this.lastCommitId = null;
  }
}
