import axios from 'axios';

const AUTODESK_BASE_URL = 'https://developer.api.autodesk.com';

export interface AutodeskToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface AutodeskProject {
  id: string;
  name: string;
  type: string;
}

export interface AutodeskFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createTime: string;
  modifiedTime: string;
}

export class AutodeskClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId || process.env.AUTODESK_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.AUTODESK_CLIENT_SECRET || '';
  }

  // Get OAuth URL for user authorization
  getAuthorizationUrl(callbackUrl: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: callbackUrl,
      scope: 'data:read data:write',
    });

    if (state) {
      params.append('state', state);
    }

    return `${AUTODESK_BASE_URL}/authentication/v2/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(code: string, callbackUrl: string): Promise<AutodeskToken> {
    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/authentication/v2/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: callbackUrl,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return response.data;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  // Get 2-legged token (app-only, no user)
  async get2LeggedToken(): Promise<AutodeskToken> {
    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/authentication/v2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'data:read',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return response.data;
    } catch (error) {
      console.error('Error getting 2-legged token:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AutodeskToken> {
    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/authentication/v2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      return response.data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  // Set access token manually
  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // Get ACC/BIM360 hubs (projects)
  async getHubs(): Promise<AutodeskProject[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(`${AUTODESK_BASE_URL}/project/v1/hubs`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.data.map((hub: any) => ({
        id: hub.id,
        name: hub.attributes.name,
        type: hub.type,
      }));
    } catch (error) {
      console.error('Error getting hubs:', error);
      throw error;
    }
  }

  // Get projects in a hub
  async getProjects(hubId: string): Promise<AutodeskProject[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/project/v1/hubs/${hubId}/projects`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.data.map((project: any) => ({
        id: project.id,
        name: project.attributes.name,
        type: project.type,
      }));
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  // Get top folders in a project
  async getTopFolders(hubId: string, projectId: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/project/v1/hubs/${hubId}/projects/${projectId}/topFolders`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Error getting top folders:', error);
      throw error;
    }
  }

  // Get folder contents
  async getFolderContents(projectId: string, folderId: string): Promise<AutodeskFile[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/folders/${folderId}/contents`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.data.map((item: any) => ({
        id: item.id,
        name: item.attributes.displayName || item.attributes.name,
        type: item.type,
        size: item.attributes.storageSize || 0,
        createTime: item.attributes.createTime,
        modifiedTime: item.attributes.lastModifiedTime,
      }));
    } catch (error) {
      console.error('Error getting folder contents:', error);
      throw error;
    }
  }

  // Download file
  async downloadFile(projectId: string, itemId: string): Promise<Buffer> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      // Get item details to get storage location
      const itemResponse = await axios.get(
        `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const storageId = itemResponse.data.data.relationships.storage.data.id;

      // Get signed URL
      const signedUrlResponse = await axios.get(
        `${AUTODESK_BASE_URL}/oss/v2/buckets/${storageId}/signedresource`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      // Download file
      const fileResponse = await axios.get(signedUrlResponse.data.signedUrl, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(fileResponse.data);
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export default AutodeskClient;
