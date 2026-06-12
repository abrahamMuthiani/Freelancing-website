// public/config.js
(function () {
    // 1. Determine the correct backend base URL based on where the site is running
    const LIVE_BACKEND_URL = 'https://innobridge-backend-h9vf.onrender.com';
    const LOCAL_BACKEND_URL = 'http://localhost:3000';
    
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const BASE_URL = isLocalhost ? LOCAL_BACKEND_URL : LIVE_BACKEND_URL;

    // 2. Save a reference to the original browser fetch function
    const originalFetch = window.fetch;

    // 3. Override global fetch to automatically swap out the URLs
    window.fetch = async function (resource, config) {
        if (typeof resource === 'string') {
            // If the code targets localhost or a relative path, rewrite it to the proper server destination
            if (resource.startsWith('http://localhost:3000')) {
                resource = resource.replace('http://localhost:3000', BASE_URL);
            } else if (resource.startsWith('/')) {
                resource = `${BASE_URL}${resource}`;
            }
        }
        // Execute the fetch call using the updated URL path smoothly
        return originalFetch(resource, config);
    };

    console.log(`🌐 InnoBridge API Gateway active. Routing traffic to: ${BASE_URL}`);
})();