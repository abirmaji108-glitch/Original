const fetch = require('node-fetch');

class VercelDeployService {
  constructor() {
    this.token = process.env.VERCEL_TOKEN;
    this.apiUrl = 'https://api.vercel.com';
  }

  /**
   * Deploy HTML to Vercel
   * @param {string} html - The HTML content
   * @param {string} projectName - Unique name for this page
   * @returns {Promise<{url: string, deploymentId: string}>}
   */
  async deployPage(html, projectName) {
    try {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Vercel deployment failed: ${error.message}`);
      }

      const deployment = await response.json();

      return {
        url: `https://${deployment.url}`,
        deploymentId: deployment.id
      };
    } catch (error) {
      console.error('Deployment error:', error);
      throw error;
    }
  }

  /**
   * Delete a deployment
   * @param {string} deploymentId - The deployment ID
   */
  async deleteDeployment(deploymentId) {
    try {
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
        throw new Error('Failed to delete deployment');
      }

      return true;
    } catch (error) {
      console.error('Delete deployment error:', error);
      throw error;
    }
  }
}

module.exports = new VercelDeployService();
