import { SpeckleClient } from "@speckle/shared";

export class SpeckleRealtimeClient {
  private client: SpeckleClient;
  private streamId: string | null = null;

  constructor(serverUrl: string, token: string) {
    this.client = new SpeckleClient({
      baseUrl: serverUrl,
      token: token, // "authToken" or "token" depending on SDK version
    });
  }

  public async subscribeToStream(
    streamId: string,
    onCommitCreated: (commit: unknown) => void
  ) {
    this.streamId = streamId;

    const stream = this.client.stream(streamId);

    await stream.subscribeCommitCreated(onCommitCreated);
  }

  public dispose() {
    if (!this.streamId) return;

    try {
      this.client.stream(this.streamId).cancelCommitCreated();
    } catch (err) {
      console.warn("Failed to unsubscribe:", err);
    }
  }
}
