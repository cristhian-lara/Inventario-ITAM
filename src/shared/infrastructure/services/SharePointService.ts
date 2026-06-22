import * as fs from 'fs';
import * as path from 'path';

export class SharePointService {
    private tenantId: string;
    private clientId: string;
    private clientSecret: string;
    private driveId: string;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor() {
        this.tenantId = process.env.AZURE_TENANT_ID || '';
        this.clientId = process.env.AZURE_CLIENT_ID || '';
        this.clientSecret = process.env.AZURE_CLIENT_SECRET || '';
        this.driveId = process.env.SHAREPOINT_DRIVE_ID || '';
    }

    /**
     * Verifica si el servicio de SharePoint está configurado
     */
    public isConfigured(): boolean {
        return Boolean(this.tenantId && this.clientId && this.clientSecret && this.driveId);
    }

    /**
     * Obtiene un token de acceso mediante el flujo de Client Credentials
     */
    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        console.log('🔑 Obteniendo nuevo token de acceso para Microsoft Graph...');
        
        const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
        
        const params = new URLSearchParams();
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);
        params.append('scope', 'https://graph.microsoft.com/.default');
        params.append('grant_type', 'client_credentials');

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error obteniendo token de Azure AD: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        // Restar 5 minutos para margen de seguridad
        this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000; 

        return this.accessToken!;
    }

    /**
     * Sube un archivo a SharePoint/OneDrive organizado por carpetas
     * @param localFilePath Ruta del archivo temporal en el servidor
     * @param fileName Nombre final del archivo (ej. acta-assig-123.pdf)
     * @param folderName Nombre de la subcarpeta (ej. 'Asignaciones', 'Devoluciones', 'Mantenimientos')
     */
    public async uploadPdf(localFilePath: string, fileName: string, folderName: string): Promise<string | null> {
        if (!this.isConfigured()) {
            console.log(`\n☁️ [SIMULADOR SHAREPOINT] El archivo ${fileName} se guardaría en la carpeta '${folderName}' de SharePoint.`);
            console.log(`☁️ Configura AZURE_TENANT_ID, AZURE_CLIENT_ID, etc. en tu .env para la integración real.\n`);
            return null;
        }

        try {
            const token = await this.getAccessToken();
            const fileBuffer = fs.readFileSync(localFilePath);
            
            // La ruta en Microsoft Graph API: /drives/{drive-id}/items/root:/{folder}/{filename}:/content
            const endpoint = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${folderName}/${fileName}:/content`;
            
            console.log(`☁️ Subiendo ${fileName} a SharePoint en la carpeta '${folderName}'...`);
            
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/pdf'
                },
                body: fileBuffer
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al subir a SharePoint: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ Archivo subido exitosamente a SharePoint. Item ID: ${data.id}`);
            
            return data.webUrl; // URL donde se puede visualizar el documento en SharePoint
        } catch (error) {
            console.error('❌ Falló la subida a SharePoint:', error);
            return null;
        }
    }
}
