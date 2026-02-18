import fetch from 'node-fetch';
import crypto from 'crypto';

class VercelDeployService {
  constructor() {
    this.token = process.env.VERCEL_TOKEN;
    this.teamId = process.env.VERCEL_TEAM_ID || null;
    
    if (!this.token) {
      console.error('❌ VERCEL_TOKEN not found in environment variables');
    } else {
      console.log('✅ Vercel token loaded successfully');
    }
  }

  async deployPage(htmlContent, projectName) {
    if (!this.token) {
      throw new Error('Vercel token not configured');
    }

    try {
      // Add cache-busting headers to prevent browser caching
      const cacheHeaders = `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">`;
      
      // Inject cache headers into <head> if it exists
      if (htmlContent.includes('<head>')) {
        htmlContent = htmlContent.replace('<head>', '<head>' + cacheHeaders);
      }

      // Create a safe project name for Vercel
      const safeName = `sento-${projectName
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '-')  // Replace any non-alphanumeric with dash
  .replace(/--+/g, '-')         // Replace multiple dashes with single dash
  .replace(/^-|-$/g, '')        // Remove leading/trailing dashes
  .slice(0, 90)}`;              // Ensure under 100 chars total
      
      console.log(`📤 Deploying to Vercel: ${safeName}`);

      // Calculate SHA hash of the content
      const sha = crypto.createHash('sha1').update(htmlContent).digest('hex');
      
      // Convert to base64
      const base64Content = Buffer.from(htmlContent, 'utf-8').toString('base64');

      // Prepare deployment payload
      const deploymentData = {
        name: safeName,
        files: [
          {
            file: 'index.html',
            data: base64Content,
            encoding: 'base64'  // ✅ Explicitly specify encoding
          }
        ],
        projectSettings: {
          framework: null,
          buildCommand: null,
          outputDirectory: null
        },
        public: true,  // ⭐ Force public access - bypass protection
        target: 'production'
      };

      // Add team ID if available
      const url = this.teamId 
        ? `https://api.vercel.com/v13/deployments?teamId=${this.teamId}`
        : 'https://api.vercel.com/v13/deployments';

      console.log(`🔗 Deploying to: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentData)
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error?.message || data.message || JSON.stringify(data);
        console.error('❌ Vercel API error:', errorMsg);
        throw new Error(`Vercel deployment failed: ${errorMsg}`);
      }

      const data = await response.json();
      
      if (!data.url) {
        console.error('❌ No URL in response:', data);
        throw new Error('Deployment succeeded but no URL returned');
      }

      const deploymentUrl = `https://${data.url}`;
      console.log(`✅ Deployed successfully: ${deploymentUrl}`);

      // 🔓 AUTOMATICALLY DISABLE VERCEL AUTHENTICATION
      try {
        console.log(`🔓 Attempting to disable protection for project: ${safeName}`);
        
        const protectionUrl = this.teamId
          ? `https://api.vercel.com/v9/projects/${safeName}?teamId=${this.teamId}`
          : `https://api.vercel.com/v9/projects/${safeName}`;

        const protectionResponse = await fetch(protectionUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ssoProtection: null,
            passwordProtection: null
          })
        });

        if (protectionResponse.ok) {
          console.log(`✅ Protection disabled successfully for ${safeName}`);
        } else {
          const protectionError = await protectionResponse.json();
          console.warn(`⚠️ Could not disable protection:`, protectionError);
          // Don't fail deployment - this is a nice-to-have
        }
      } catch (protectionError) {
        console.warn(`⚠️ Protection disable failed (non-critical):`, protectionError.message);
        // Continue anyway - deployment already succeeded
      }

      // ✅ Return the stable production URL.
      // Because every deployment uses the same `name` (safeName) and target: 'production',
      // Vercel automatically routes https://{safeName}.vercel.app to the latest deployment.
      // This means every edit redeploys and this one stable URL always shows the latest version.
      // The unique per-deployment URLs (e.g. ...9s6b2yz6h.vercel.app) are Vercel immutable
      // snapshots — they cannot be updated, which is why we don't use or store them.
      return {
        url: `https://${safeName}.vercel.app`,
        deploymentId: data.id || data.uid
      };

    } catch (error) {
      console.error('❌ Deployment error:', error.message);
      throw error;
    }
  }

  async deleteDeployment(deploymentId) {
    if (!this.token) {
      throw new Error('Vercel token not configured');
    }

    try {
      const url = this.teamId
        ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${this.teamId}`
        : `https://api.vercel.com/v13/deployments/${deploymentId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error?.message || data.message || 'Unknown error';
        throw new Error(`Failed to delete deployment: ${errorMsg}`);
      }

      console.log(`✅ Deployment ${deploymentId} deleted successfully`);
      return { success: true };

    } catch (error) {
      console.error('❌ Delete error:', error.message);
      throw error;
    }
  }
}

export default new VercelDeployService();
