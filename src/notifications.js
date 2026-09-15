// ===============================
// Notifications System - Innobridge
// ===============================

const notificationBtn = document.getElementById("notificationBtn");
const notificationBadge = document.querySelector(".notification-badge");
let notificationDropdown = null;

let notifications = [];
let user = null;
let isDropdownVisible = false;

document.addEventListener("DOMContentLoaded", () => {
  user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user._id) {
    console.warn("⚠️ No logged-in user found. Notifications disabled.");
    return;
  }

  createNotificationDropdown();
  fetchNotifications();
  const intervalId = setInterval(fetchNotifications, 30000);

  if (notificationBtn) notificationBtn.addEventListener("click", toggleDropdown);
  window.addEventListener("beforeunload", () => clearInterval(intervalId));
});

function createNotificationDropdown() {
  notificationDropdown = document.createElement("div");
  notificationDropdown.id = "notificationDropdown";
  notificationDropdown.className = "notification-dropdown hidden";
  document.body.appendChild(notificationDropdown);

  Object.assign(notificationDropdown.style, {
    position: "absolute",
    width: "300px",
    maxHeight: "400px",
    overflowY: "auto",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    zIndex: "1000"
  });
}

// ===============================
// Fetch Notifications
// ===============================
async function fetchNotifications() {
  if (!user || !user._id) return;
  try {
    const res = await fetch(`http://localhost:3000/api/notifications/${user._id}`);
    if (!res.ok) throw new Error("Failed to fetch notifications");

    const data = await res.json();
    if (Array.isArray(data)) notifications = data;
    renderNotifications();
    updateBadge();
  } catch (err) {
    console.error(" Error fetching notifications:", err);
  }
}

function renderNotifications() {
  if (!notificationDropdown) return;
  notificationDropdown.innerHTML = "";

  if (!Array.isArray(notifications) || notifications.length === 0) {
    notificationDropdown.innerHTML = `<p style="padding:12px; text-align:center; color:#666;">No notifications</p>`;
    return;
  }

  notifications.forEach(notif => {
    const notifItem = document.createElement("div");
    notifItem.className = "notification-item";
    Object.assign(notifItem.style, {
      padding: "10px 12px",
      borderBottom: "1px solid #eee",
      cursor: "pointer",
      background: notif.isRead ? "#fafafa" : "#e6f4ff"
    });

    notifItem.innerHTML = `
      <p style="margin:0; font-size:14px; color:#333;">${notif.message || ""}</p>
      <span style="font-size:12px; color:#888;">
        ${notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ""}
      </span>
    `;

    notifItem.addEventListener("click", () => markAsRead(notif._id));
    notificationDropdown.appendChild(notifItem);
  });
}

function updateBadge() {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  if (notificationBadge) notificationBadge.textContent = unreadCount > 0 ? unreadCount : "";
}

function toggleDropdown() {
  if (!notificationDropdown) return;
  isDropdownVisible = !isDropdownVisible;
  notificationDropdown.classList.toggle("hidden", !isDropdownVisible);

  if (notificationBtn) {
    const rect = notificationBtn.getBoundingClientRect();
    notificationDropdown.style.top = `${rect.bottom + 10}px`;
    notificationDropdown.style.right = `${window.innerWidth - rect.right}px`;
  }
}

async function markAsRead(notificationId) {
  try {
    const res = await fetch(`http://localhost:3000/api/notifications/${notificationId}/read`, {
      method: "PUT"
    });
    if (!res.ok) throw new Error("Failed to mark as read");

    notifications = notifications.map(n => n._id === notificationId ? { ...n, isRead: true } : n);
    renderNotifications();
    updateBadge();
  } catch (err) {
    console.error(" Error marking notification as read:", err);
  }
}

// ===============================
// Send Notifications - Flexible Logic
// ===============================

/**
 * Send notifications based on event type and participants.
 * 
 * @param {string} eventType - Type of event ("project_posted", "proposal_submitted", etc.)
 * @param {object} data - Contains IDs like clientId, freelancerId, adminId, projectTitle, projectName.
 */
async function sendNotification(eventType, data) {
  const eventMap = {
    project_posted: {
      recipients: data.freelancerIds || [], // All freelancers
      message: `New project available: ${data.projectTitle}`,
    },
    proposal_submitted: {
      recipients: [data.clientId],
      message: "A new proposal has been submitted for your project.",
    },
    client_approved: {
      recipients: [data.freelancerId],
      message: "Your project proposal has been approved!",
    },
    admin_approved: {
      recipients: [data.clientId, data.freelancerId],
      message: "Your project has been approved by the admin.",
    },
    user_reported: {
      recipients: [data.adminId],
      message: "A user has been reported for misconduct.",
    },
    payment_success: {
      recipients: [data.clientId, data.freelancerId],
      message: `Payment confirmed for ${data.projectName}.`,
    }
  };

  const event = eventMap[eventType];
  if (!event || !event.recipients || event.recipients.length === 0) {
    console.warn("⚠️ Invalid event or missing recipients:", eventType);
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipients: event.recipients,
        message: event.message,
        type: eventType,
      }),
    });

    if (!res.ok) throw new Error("Failed to send notification");
    console.log(` Notification sent for event: ${eventType}`);
  } catch (err) {
    console.error(" Error sending notification:", err);
  }
}
