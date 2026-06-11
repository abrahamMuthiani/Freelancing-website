document.addEventListener('DOMContentLoaded', () => {
  const activityContainer = document.getElementById('activity-container');
  const userId = localStorage.getItem('userId'); // Store userId in localStorage on login

  if (!userId) {
    activityContainer.innerHTML = '<p class="text-red-500">User ID not found. Please log in.</p>';
    return;
  }

  fetchUserActivity(userId);

  async function fetchUserActivity(id) {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${id}/activity`);
      if (!response.ok) throw new Error('Failed to fetch activity');

      const data = await response.json();
      const { recentProjects, activityCount } = data;

      if (recentProjects.length === 0) {
        activityContainer.innerHTML = '<p class="text-gray-500">No recent activity found.</p>';
        return;
      }

      const projectList = recentProjects.map(project => {
        const date = new Date(project.createdAt).toLocaleDateString();
        return `
          <div class="border rounded p-4 mb-2 shadow-sm bg-white">
            <h3 class="text-lg font-semibold">${project.title}</h3>
            <p class="text-sm text-gray-600">Posted on: ${date}</p>
            <p class="text-sm text-blue-600">Status: ${project.status}</p>
          </div>
        `;
      }).join('');

      activityContainer.innerHTML = `
        <h2 class="text-xl font-bold mb-4">Recent Activity (${activityCount} projects)</h2>
        ${projectList}
      `;
    } catch (err) {
      console.error('Error fetching user activity:', err);
      activityContainer.innerHTML = '<p class="text-red-500">Error loading activity.</p>';
    }
  }
});
