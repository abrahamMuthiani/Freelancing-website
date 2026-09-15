// Freelancer Profile Interactive Features (updated)
// - Shows avatar correctly (div -> img fallback)
// - Uploads profile picture to file server (http://localhost:3001/upload/project)
// - Updates user record via PUT /api/users/:id
// - Allows editing/saving "About Me" (UI or prompt fallback)
// - Defensive: checks element existence, updates localStorage user object after changes

// DOM Elements
const editProfileBtn = document.querySelector('.edit-profile-btn');
const availabilityBadge = document.querySelector('.availability-badge');
const portfolioItems = document.querySelectorAll('.portfolio-item');
const skillItems = document.querySelectorAll('.skill-item');

const API_BASE = 'http://localhost:3000';
const FILES_BASE = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
  initializeInteractivity();
  setupPortfolioHovers();
  setupSkillAnimations();
  setupFormValidation();
  setupProfileSaveHandlers();
  loadProfileData();
});

// Interactivity
function initializeInteractivity() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function() {
      if (!this.classList.contains('no-loading')) addLoadingState(this);
    });
  });
}

function setupPortfolioHovers() {
  portfolioItems.forEach(item => {
    const overlay = item.querySelector('.portfolio-overlay');
    const image = item.querySelector('.portfolio-image img');
    item.addEventListener('mouseenter', () => {
      if (overlay) overlay.style.opacity = '1';
      if (image) image.style.transform = 'scale(1.05)';
    });
    item.addEventListener('mouseleave', () => {
      if (overlay) overlay.style.opacity = '0';
      if (image) image.style.transform = 'scale(1)';
    });
  });
}

function setupSkillAnimations() {
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeIn 0.5s ease-out forwards';
        entry.target.style.animationDelay = `${Array.from(skillItems).indexOf(entry.target) * 0.1}s`;
      }
    });
  }, observerOptions);
  skillItems.forEach(item => observer.observe(item));
}

function setupFormValidation() {
  const cvUploadInputs = document.querySelectorAll('input[type="file"]');
  cvUploadInputs.forEach(input => input.addEventListener('change', validateFileUpload));
}

// Profile load/render
async function loadProfileData() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user._id) return console.warn("User not logged in");

  try {
    const res = await fetch(`${API_BASE}/api/users/${user._id}`);
    if (!res.ok) throw new Error(`Failed to fetch profile data (${res.status})`);
    const data = await res.json();

    // Show About Me
    const aboutTextEl = document.querySelector(".about-text");
    if (aboutTextEl) aboutTextEl.textContent = data.about?.trim() ? data.about : "No description added yet.";

    // Show avatar
    handleAvatarRendering(data);

    // Build profileData from DB
    const profileData = {
      id: data.id || data._id || user._id,
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unnamed User",
      title: data.fieldOfWork ? `Field of Work: ${data.fieldOfWork}` : "Field of Work: Not set",
      availability: data.availability || "unavailable",
      rating: Number(data.rating || 0),
      reviewCount: data.reviewsCount || 0,
      location: (data.city && data.country) ? `${data.city}, ${data.country}` : (data.city || data.country) || "Location not specified",
      hourlyRate: data.hourlyRate || 0,
      responseTime: data.responseTime || "N/A",
      jobSuccess: data.jobSuccess || "N/A",
      profileViews: data.profileViews || "0",
      profilePictureId: data.profilePictureId || data.profilePicture || null
    };

    // Populate UI fields
    const nameEl = document.querySelector(".profile-name");
    const taglineEl = document.querySelector(".profile-tagline");
    const locationEl = document.querySelector("#profileLocation");
    if (nameEl) nameEl.textContent = profileData.name;
    if (taglineEl) taglineEl.textContent = profileData.title;
    if (locationEl) locationEl.textContent = profileData.location;

    // Rating stars
    const starsContainer = document.querySelector("#ratingStars");
    if (starsContainer) {
      starsContainer.innerHTML = "";
      const whole = Math.floor(profileData.rating);
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("i");
        star.className = i <= whole ? "fas fa-star" : "far fa-star";
        starsContainer.appendChild(star);
      }
    }
    const ratingText = document.querySelector("#ratingText");
    if (ratingText) ratingText.textContent = `${profileData.rating.toFixed(1)} (${profileData.reviewCount} reviews)`;

    const hourlyRateEl = document.querySelector("#hourlyRate");
    if (hourlyRateEl) hourlyRateEl.textContent = `$${profileData.hourlyRate}/hr`;
    const jobSuccessEl = document.querySelector("#jobSuccess");
    if (jobSuccessEl) jobSuccessEl.textContent = profileData.jobSuccess;

    // update stats
    updateProfileStats(profileData);

    // Update localStorage
    const mergedUser = { ...user, ...data };
    localStorage.setItem("user", JSON.stringify(mergedUser));
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

function handleAvatarRendering(data) {
  const avatarContainer = document.getElementById("avatarEl");
  if (!avatarContainer) return;

  const showInitials = (firstName, lastName) => {
    avatarContainer.innerHTML = '';
    const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
    const span = document.createElement("span");
    span.id = "avatarInitials";
    span.textContent = initials || "?";
    avatarContainer.appendChild(span);
  };

  const showImage = (src) => {
    avatarContainer.innerHTML = '';
    const img = document.createElement("img");
    img.alt = "Profile Picture";
    img.src = src;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    avatarContainer.appendChild(img);
  };

  const picId = data.profilePictureId || data.profilePicture;
  if (picId) {
    const url = `${FILES_BASE}/file/${picId}`;
    showImage(url);
    const img = avatarContainer.querySelector("img");
    if (img) img.addEventListener("error", () => showInitials(data.firstName, data.lastName));
  } else if (data.profilePicUrl) showImage(data.profilePicUrl);
  else showInitials(data.firstName, data.lastName);
}

// Profile save/update handlers
function setupProfileSaveHandlers() {
  // About Me save button
  const saveAboutBtn = document.getElementById("saveAboutBtn");
  const editAboutTextarea = document.getElementById("editAboutTextarea");

  if (saveAboutBtn && editAboutTextarea) {
    saveAboutBtn.addEventListener("click", async () => {
      const newAbout = editAboutTextarea.value.trim();
      if (!newAbout) return showNotification("About cannot be empty", "error");
      await updateUserField({ about: newAbout });
      const aboutEl = document.querySelector(".about-text");
      if (aboutEl) aboutEl.textContent = newAbout;
    });
  }

  // Edit Profile prompt fallback
  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", async () => {
      const aboutEl = document.querySelector(".about-text");
      const existing = aboutEl?.textContent?.trim() === "No description added yet." ? "" : (aboutEl?.textContent || "");
      const newAbout = prompt("Edit About Me:", existing) || "";
      if (newAbout !== null) {
        try {
          await updateUserField({ about: newAbout.trim() });
          if (aboutEl) aboutEl.textContent = newAbout.trim() || "No description added yet.";
          showNotification("Profile updated", "success");
        } catch {
          showNotification("Failed to update profile", "error");
        }
      }
    });
  }

  // Profile picture save event
  const profilePicComponent = document.getElementById("profilePicComponent");
  if (profilePicComponent) {
    profilePicComponent.addEventListener("profile:save", async (e) => {
      const { file, src } = e.detail || {};
      if (file) await uploadProfilePicture(file);
      else if (src) {
        const blob = await fetchSrcToBlob(src);
        if (blob) {
          const fileFromBlob = new File([blob], `avatar_${Date.now()}.png`, { type: blob.type || "image/png" });
          await uploadProfilePicture(fileFromBlob);
        } else showNotification("Failed to process selected picture", "error");
      } else showNotification("No picture selected", "warning");
    });
  }

  // Input-based picture change
  const profilePicInput = document.getElementById("profilePicInput");
  if (profilePicInput) {
    profilePicInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) uploadProfilePicture(f);
    });
  }
}

async function fetchSrcToBlob(src) {
  try {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error("Failed to fetch image src");
    return await resp.blob();
  } catch {
    return null;
  }
}

async function uploadProfilePicture(file) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user._id) return showNotification("Not authenticated", "error");

  try {
    const fd = new FormData();
    fd.append("file", file);

    const upRes = await fetch(`${FILES_BASE}/upload/project`, { method: "POST", body: fd });
    const upJson = await upRes.json();
    if (!upRes.ok) throw new Error(upJson?.message || "Upload failed");

    const fileId = upJson.fileId || upJson.id || upJson._id || upJson.data?.id;
    if (!fileId) throw new Error("No file id returned from upload");

    await updateUserField({ profilePictureId: fileId });

    const avatarContainer = document.getElementById("avatarEl");
    if (avatarContainer) avatarContainer.innerHTML = `<img src="${FILES_BASE}/file/${fileId}" alt="Profile Picture" style="width:100%;height:100%;object-fit:cover">`;

    localStorage.setItem("user", JSON.stringify({ ...user, profilePictureId: fileId }));
    showNotification("Profile picture updated", "success");
  } catch (err) {
    console.error("uploadProfilePicture error:", err);
    showNotification("Failed to update profile picture", "error");
  }
}

async function updateUserField(payload = {}) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user._id) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/api/users/${user._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
  const updated = await res.json().catch(() => null);
  localStorage.setItem("user", JSON.stringify({ ...user, ...(updated || payload) }));
  return updated || payload;
}

// Other UI actions
function contactFreelancer() {
  showNotification('Opening contact form...', 'info');
  setTimeout(() => {
    console.log('Contact freelancer simulated');
    showNotification('Contact form opened successfully!', 'success');
  }, 700);
}

function saveProfile() {
  const saveBtn = event?.target;
  if (!saveBtn) return;
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  saveBtn.disabled = true;

  setTimeout(() => {
    const savedProfiles = JSON.parse(localStorage.getItem('savedProfiles') || '[]');
    const profileData = { id: 'demo-001', name: 'Saved Profile', savedAt: new Date().toISOString() };
    const idx = savedProfiles.findIndex(p => p.id === profileData.id);
    if (idx >= 0) { savedProfiles.splice(idx, 1); showNotification('Removed', 'info'); }
    else { savedProfiles.push(profileData); showNotification('Saved', 'success'); }
    localStorage.setItem('savedProfiles', JSON.stringify(savedProfiles));
    saveBtn.disabled = false;
    setTimeout(() => saveBtn.innerHTML = originalText, 1500);
  }, 800);
}

// Files/CV/Portfolio
function uploadCV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx';
  input.style.display = 'none';
  input.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) handleCVUpload(f);
  });
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

function handleCVUpload(file) {
  const maxSize = 10 * 1024 * 1024;
  const allowed = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (file.size > maxSize) return showNotification('File size must be less than 10MB', 'error');
  if (!allowed.includes(file.type)) return showNotification('Please upload PDF or Word', 'error');
  showUploadProgress(file.name);
  setTimeout(() => {
    updateCVSection(file.name);
    showNotification('CV uploaded', 'success');
  }, 1200);
}

function addPortfolioLink() {
  const url = prompt('Enter your portfolio URL:');
  if (!url) return;
  if (!isValidURL(url)) return showNotification('Invalid URL', 'error');
  showNotification('Portfolio added', 'success');
}

// UI utilities
function addLoadingState(button) {
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  button.disabled = true;
  setTimeout(() => { button.innerHTML = originalText; button.disabled = false; }, 2000);
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `<div class="notification-content"><i class="fas fa-${getNotificationIcon(type)}"></i><span>${message}</span></div>`;
  notification.style.cssText = `position:fixed;top:20px;right:20px;background:${getNotificationColor(type)};color:white;padding:1rem 1.5rem;border-radius:8px;z-index:10000;`;
  document.body.appendChild(notification);
  setTimeout(() => { notification.style.opacity = '0'; setTimeout(()=>notification.remove(), 300); }, 3500);
}

function getNotificationIcon(type) {
  return { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' }[type] || 'info-circle';
}
function getNotificationColor(type) {
  return { success: 'var(--color-success,#16a34a)', error: '#ef4444', warning: '#f59e0b', info: '#2563eb' }[type] || '#2563eb';
}

function showUploadProgress(filename) {
  const progressModal = document.createElement('div');
  progressModal.className = 'upload-modal';
  progressModal.innerHTML = `<div class="upload-content"><h3>Uploading ${filename}</h3><div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div><span class="progress-text">0%</span></div>`;
  progressModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';
  document.body.appendChild(progressModal);
  const fill = progressModal.querySelector('.progress-fill');
  const text = progressModal.querySelector('.progress-text');
  let p = 0;
  const iv = setInterval(() => {
    p = Math.min(100, p + Math.random()*25);
    fill.style.width = p + '%';
    text.textContent = Math.round(p) + '%';
    if (p >= 100) { clearInterval(iv); setTimeout(()=>progressModal.remove(), 400); }
  }, 180);
}

function updateCVSection(filename) {
  const cvFilename = document.querySelector('.cv-filename');
  if (cvFilename) cvFilename.textContent = filename;
}

function updateProfileStats(data) {
  const elements = {
    '.rating-text': `${data.rating} (${data.reviewCount} reviews)`,
    '.hourly-rate': `$${data.hourlyRate}/hr`,
    '.stat-number-sidebar': data.profileViews
  };
  Object.entries(elements).forEach(([sel, val]) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = val;
  });
}

function validateFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return false;
  const maxSize = 10 * 1024 * 1024;
  const allowedTypes = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (file.size > maxSize) return showNotification('File too large', 'error');
  if (!allowedTypes.includes(file.type)) return showNotification('Invalid type', 'error');
  showNotification('File valid', 'success');
  return true;
}

function isValidURL(string) {
  try { new URL(string); return true; } catch { return false; }
}

// Add custom CSS animations
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .upload-modal .upload-content {
        background: var(--color-card);
        padding: 2rem;
        border-radius: var(--radius);
        text-align: center;
        min-width: 300px;
    }
    .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--color-secondary);
        border-radius: 4px;
        overflow: hidden;
        margin: 1rem 0;
    }
    .progress-fill {
        height: 100%;
        background: var(--color-primary);
        width: 0%;
        transition: width 0.3s ease;
    }
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(animationStyles);

// Export functions for global access
window.contactFreelancer = contactFreelancer;
window.saveProfile = saveProfile;
window.uploadCV = uploadCV;
window.addPortfolioLink = addPortfolioLink;

// Fetch user profile by email (example usage)
function fetchUserProfileByEmail(email) {
  fetch(`http://localhost:3000/api/user?email=${encodeURIComponent(email)}`)
    .then(async res => {
      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(`Server error: ${res.status} - ${errMsg}`);
      }
      return res.json();
    })
    .then(data => {
      // handle user data
      console.log('User profile:', data);
    })
    .catch(err => {
      console.error('Error loading user profile:', err);
    });
}

// Fetch the logged-in user's profile (freelancer, client, or admin)
const user = JSON.parse(localStorage.getItem("user"));
if (user && user.email) {
  fetchUserProfileByEmail(user.email);
}
