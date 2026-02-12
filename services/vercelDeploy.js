// services/vercelDeploy.js
class VercelDeployService {
  constructor() {
    this.token = process.env.VERCEL_TOKEN;
    this.apiUrl = 'https://api.vercel.com';
  }

  async deployPage(html, projectName) {
    try {
      const files = [
        {
          file: 'index.html',
          data: html
        }
      ];

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
            framework: null,
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

export default new VercelDeployService();
