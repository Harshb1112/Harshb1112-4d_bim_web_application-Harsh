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
  async get2LeggedToken(scopes?: string): Promise<AutodeskToken> {
    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/authentication/v2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: scopes || 'data:read data:write data:create bucket:read bucket:create bucket:delete viewables:read',
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

  // Create a new project in ACC/BIM360
  async createProject(accountId: string, projectData: CreateProjectData): Promise<AutodeskProjectDetails> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/hq/v1/accounts/${accountId}/projects`,
        {
          name: projectData.name,
          type: projectData.type || 'ACC',
          status: projectData.status || 'active',
          start_date: projectData.startDate,
          end_date: projectData.endDate,
          project_value: projectData.projectValue,
          currency: projectData.currency || 'USD',
          job_number: projectData.jobNumber,
          address_line_1: projectData.addressLine1,
          address_line_2: projectData.addressLine2,
          city: projectData.city,
          state_or_province: projectData.stateOrProvince,
          postal_code: projectData.postalCode,
          country: projectData.country,
          timezone: projectData.timezone,
          construction_type: projectData.constructionType,
          contract_type: projectData.contractType,
          template_project_id: projectData.templateProjectId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return this.mapProjectResponse(response.data);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Update an existing project
  async updateProject(accountId: string, projectId: string, projectData: Partial<CreateProjectData>): Promise<AutodeskProjectDetails> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.patch(
        `${AUTODESK_BASE_URL}/hq/v1/accounts/${accountId}/projects/${projectId}`,
        {
          name: projectData.name,
          status: projectData.status,
          start_date: projectData.startDate,
          end_date: projectData.endDate,
          project_value: projectData.projectValue,
          job_number: projectData.jobNumber,
          address_line_1: projectData.addressLine1,
          city: projectData.city,
          state_or_province: projectData.stateOrProvince,
          postal_code: projectData.postalCode,
          country: projectData.country,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return this.mapProjectResponse(response.data);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Get project details
  async getProjectDetails(accountId: string, projectId: string): Promise<AutodeskProjectDetails> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/hq/v1/accounts/${accountId}/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return this.mapProjectResponse(response.data);
    } catch (error) {
      console.error('Error getting project details:', error);
      throw error;
    }
  }

  // Get account (hub) details
  async getAccounts(): Promise<AutodeskAccount[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/hq/v1/accounts`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.map((account: any) => ({
        id: account.id,
        name: account.name,
        region: account.region,
      }));
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw error;
    }
  }

  // Get project templates
  async getProjectTemplates(accountId: string): Promise<AutodeskProjectTemplate[]> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/hq/v1/accounts/${accountId}/projects?filter[status]=template`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data.map((template: any) => ({
        id: template.id,
        name: template.name,
        type: template.type,
      }));
    } catch (error) {
      console.error('Error getting project templates:', error);
      throw error;
    }
  }

  // Create a storage location for file upload
  async createStorage(projectId: string, folderId: string, fileName: string): Promise<StorageLocation> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/storage`,
        {
          jsonapi: { version: '1.0' },
          data: {
            type: 'objects',
            attributes: {
              name: fileName,
            },
            relationships: {
              target: {
                data: {
                  type: 'folders',
                  id: folderId,
                },
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/vnd.api+json',
          },
        }
      );

      return {
        id: response.data.data.id,
        uploadUrl: response.data.data.relationships?.target?.links?.related?.href,
      };
    } catch (error) {
      console.error('Error creating storage:', error);
      throw error;
    }
  }

  // Upload file to storage
  async uploadFile(uploadUrl: string, fileBuffer: Buffer, contentType: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length,
        },
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Create first version of an item (file) in a folder
  async createItem(projectId: string, folderId: string, storageId: string, fileName: string): Promise<AutodeskItem> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/items`,
        {
          jsonapi: { version: '1.0' },
          data: {
            type: 'items',
            attributes: {
              displayName: fileName,
              extension: {
                type: 'items:autodesk.core:File',
                version: '1.0',
              },
            },
            relationships: {
              tip: {
                data: {
                  type: 'versions',
                  id: '1',
                },
              },
              parent: {
                data: {
                  type: 'folders',
                  id: folderId,
                },
              },
            },
          },
          included: [
            {
              type: 'versions',
              id: '1',
              attributes: {
                name: fileName,
                extension: {
                  type: 'versions:autodesk.core:File',
                  version: '1.0',
                },
              },
              relationships: {
                storage: {
                  data: {
                    type: 'objects',
                    id: storageId,
                  },
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/vnd.api+json',
          },
        }
      );

      return {
        id: response.data.data.id,
        name: response.data.data.attributes.displayName,
        type: response.data.data.type,
      };
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  // Create a folder in a project
  async createFolder(projectId: string, parentFolderId: string, folderName: string): Promise<AutodeskFolder> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/data/v1/projects/${projectId}/folders`,
        {
          jsonapi: { version: '1.0' },
          data: {
            type: 'folders',
            attributes: {
              name: folderName,
              extension: {
                type: 'folders:autodesk.core:Folder',
                version: '1.0',
              },
            },
            relationships: {
              parent: {
                data: {
                  type: 'folders',
                  id: parentFolderId,
                },
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/vnd.api+json',
          },
        }
      );

      return {
        id: response.data.data.id,
        name: response.data.data.attributes.name,
        type: response.data.data.type,
      };
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // ============================================
  // MODEL DERIVATIVE API - URN Generation
  // ============================================

  // Create a bucket for storing files (OSS)
  async createBucket(bucketKey: string, policyKey: 'transient' | 'temporary' | 'persistent' = 'temporary'): Promise<OSSBucket> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/oss/v2/buckets`,
        {
          bucketKey: bucketKey,
          policyKey: policyKey,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        bucketKey: response.data.bucketKey,
        bucketOwner: response.data.bucketOwner,
        createdDate: response.data.createdDate,
        policyKey: response.data.policyKey,
      };
    } catch (error: any) {
      // Bucket already exists is OK
      if (error.response?.status === 409) {
        return { bucketKey, bucketOwner: '', createdDate: '', policyKey };
      }
      console.error('Error creating bucket:', error);
      throw error;
    }
  }

  // Upload file to OSS bucket and get object ID
  async uploadToOSS(bucketKey: string, objectKey: string, fileBuffer: Buffer, contentType: string): Promise<OSSObject> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.put(
        `${AUTODESK_BASE_URL}/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}`,
        fileBuffer,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': contentType,
            'Content-Length': fileBuffer.length,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      return {
        objectId: response.data.objectId,
        objectKey: response.data.objectKey,
        bucketKey: response.data.bucketKey,
        size: response.data.size,
        sha1: response.data.sha1,
        location: response.data.location,
      };
    } catch (error) {
      console.error('Error uploading to OSS:', error);
      throw error;
    }
  }

  // Convert object ID to base64 URN
  objectIdToUrn(objectId: string): string {
    return Buffer.from(objectId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Start translation job (Model Derivative API)
  async translateModel(urn: string, outputFormats: TranslationOutput[] = [{ type: 'svf2', views: ['2d', '3d'] }]): Promise<TranslationJob> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.post(
        `${AUTODESK_BASE_URL}/modelderivative/v2/designdata/job`,
        {
          input: {
            urn: urn,
          },
          output: {
            formats: outputFormats,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'x-ads-force': 'true', // Force re-translation if needed
          },
        }
      );

      return {
        urn: response.data.urn,
        result: response.data.result,
        acceptedJobs: response.data.acceptedJobs,
      };
    } catch (error) {
      console.error('Error starting translation:', error);
      throw error;
    }
  }

  // Check translation status
  async getTranslationStatus(urn: string): Promise<TranslationStatus> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/modelderivative/v2/designdata/${urn}/manifest`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return {
        urn: response.data.urn,
        status: response.data.status,
        progress: response.data.progress,
        hasThumbnail: response.data.hasThumbnail,
        derivatives: response.data.derivatives || [],
      };
    } catch (error) {
      console.error('Error getting translation status:', error);
      throw error;
    }
  }

  // Full process: Upload file and get URN for viewer
  async uploadAndTranslate(
    bucketKey: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<{ urn: string; objectId: string }> {
    // 1. Create bucket (if not exists)
    await this.createBucket(bucketKey);

    // 2. Upload file to OSS
    const ossObject = await this.uploadToOSS(bucketKey, fileName, fileBuffer, contentType);

    // 3. Convert to URN
    const urn = this.objectIdToUrn(ossObject.objectId);

    // 4. Start translation
    await this.translateModel(urn);

    return {
      urn: urn,
      objectId: ossObject.objectId,
    };
  }

  // Wait for translation to complete (polling)
  async waitForTranslation(urn: string, maxWaitMs: number = 300000, intervalMs: number = 5000): Promise<TranslationStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTranslationStatus(urn);

      if (status.status === 'success') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error('Translation failed');
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Translation timeout');
  }

  // Get viewable metadata
  async getViewableMetadata(urn: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      const response = await axios.get(
        `${AUTODESK_BASE_URL}/modelderivative/v2/designdata/${urn}/metadata`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error;
    }
  }

  // Delete manifest (to re-translate)
  async deleteManifest(urn: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Access token not set');
    }

    try {
      await axios.delete(
        `${AUTODESK_BASE_URL}/modelderivative/v2/designdata/${urn}/manifest`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Error deleting manifest:', error);
      throw error;
    }
  }

  // Helper to map project response
  private mapProjectResponse(data: any): AutodeskProjectDetails {
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      projectValue: data.project_value,
      currency: data.currency,
      jobNumber: data.job_number,
      addressLine1: data.address_line_1,
      addressLine2: data.address_line_2,
      city: data.city,
      stateOrProvince: data.state_or_province,
      postalCode: data.postal_code,
      country: data.country,
      timezone: data.timezone,
      constructionType: data.construction_type,
      contractType: data.contract_type,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

// Interfaces for project creation
export interface CreateProjectData {
  name: string;
  type?: 'ACC' | 'BIM360';
  status?: 'active' | 'inactive' | 'archived';
  startDate?: string;
  endDate?: string;
  projectValue?: number;
  currency?: string;
  jobNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  constructionType?: string;
  contractType?: string;
  templateProjectId?: string;
}

export interface AutodeskProjectDetails {
  id: string;
  name: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  projectValue?: number;
  currency?: string;
  jobNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  constructionType?: string;
  contractType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AutodeskAccount {
  id: string;
  name: string;
  region: string;
}

export interface AutodeskProjectTemplate {
  id: string;
  name: string;
  type: string;
}

export interface StorageLocation {
  id: string;
  uploadUrl?: string;
}

export interface AutodeskItem {
  id: string;
  name: string;
  type: string;
}

export interface AutodeskFolder {
  id: string;
  name: string;
  type: string;
}

// OSS (Object Storage Service) interfaces
export interface OSSBucket {
  bucketKey: string;
  bucketOwner: string;
  createdDate: string;
  policyKey: string;
}

export interface OSSObject {
  objectId: string;
  objectKey: string;
  bucketKey: string;
  size: number;
  sha1: string;
  location: string;
}

// Model Derivative interfaces
export interface TranslationOutput {
  type: 'svf' | 'svf2' | 'thumbnail' | 'stl' | 'step' | 'iges' | 'obj' | 'dwg' | 'fbx';
  views?: ('2d' | '3d')[];
}

export interface TranslationJob {
  urn: string;
  result: string;
  acceptedJobs?: any;
}

export interface TranslationStatus {
  urn: string;
  status: 'pending' | 'inprogress' | 'success' | 'failed' | 'timeout';
  progress: string;
  hasThumbnail?: boolean;
  derivatives?: any[];
}

export default AutodeskClient;
