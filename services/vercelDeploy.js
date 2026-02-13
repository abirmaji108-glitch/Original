// services/vercelDeploy.js
// Vercel deployment service with proper error handling

class VercelDeployService {
  constructor() {
    this.token = process.env.VERCEL_TOKEN;
    this.apiUrl = 'https://api.vercel.com';
    
    if (!this.token) {
      console.error('❌ VERCEL_TOKEN not found in environment variables!');
    } else {
      console.log('✅ Vercel token loaded successfully');
    }
  }

  /**
   * Deploy HTML to Vercel
   * @param {string} html - The HTML content
   * @param {string} projectName - Unique name for this page
   * @returns {Promise<{url: string, deploymentId: string}>}
   */
  async deployPage(html, projectName) {
    try {
      if (!this.token) {
        throw new Error('Vercel token not configured. Please add VERCEL_TOKEN to environment variables.');
      }

      console.log(`📤 Deploying to Vercel: ${projectName}`);
      
      // Vercel expects files in this format
      const files = [
        {
          file: 'index.html',
          data: html
        }
      ];

      // Create deployment
      const response = await fetch(`${this.apiUrl}/v13/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          files: files,
          projectSettings: {
            framework: null, // Static HTML, no framework
          }
        })
      });

      // Parse response
      const data = await response.json();

      // Check for errors
      if (!response.ok) {
        console.error('❌ Vercel API error:', data);
        
        // Extract error message properly
        const errorMsg = data.error?.message || data.message || JSON.stringify(data);
        throw new Error(`Vercel deployment failed: ${errorMsg}`);
      }

      // Check if deployment was created
      if (!data.url) {
        console.error('❌ Vercel response missing URL:', data);
        throw new Error('Vercel deployment succeeded but no URL returned');
      }

      const deploymentUrl = `https://${data.url}`;
      console.log(`✅ Deployed successfully: ${deploymentUrl}`);

      return {
        url: deploymentUrl,
        deploymentId: data.id || data.uid
      };
      
    } catch (error) {
      console.error('❌ Deployment error:', error);
      
      // Re-throw with more context
      if (error.message.includes('Vercel')) {
        throw error; // Already formatted
      } else {
        throw new Error(`Deployment failed: ${error.message}`);
      }
    }
  }

  /**
   * Delete a deployment
   * @param {string} deploymentId - The deployment ID
   */
  async deleteDeployment(deploymentId) {
    try {
      if (!this.token) {
        throw new Error('Vercel token not configured');
      }

      console.log(`🗑️ Deleting deployment: ${deploymentId}`);

      const response = await fetch(
        `${this.apiUrl}/v13/deployments/${deploymentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = data.error?.message || data.message || 'Unknown error';
        throw new Error(`Failed to delete deployment: ${errorMsg}`);
      }

      console.log(`✅ Deployment deleted: ${deploymentId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Delete deployment error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new VercelDeployService();
