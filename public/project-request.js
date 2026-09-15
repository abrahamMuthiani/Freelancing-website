// ===============================
// DOM Elements (safe selections)
// ===============================
const form = document.getElementById("proposalForm");
const proposalTextarea = document.getElementById("proposal");
const bidAmountInput = document.getElementById("bidAmount");
const completionTimeSelect = document.getElementById("completionTime");
const fileUpload = document.getElementById("fileUpload");
const fileInput = document.getElementById("fileInput");
const filePreview = document.getElementById("filePreview");
const fileName = document.getElementById("fileName");
const removeFileBtn = document.getElementById("removeFile");
const submitBtn = document.getElementById("submitBtn");
const submitText = document.getElementById("submitText");
const toast = document.getElementById("toast");
const toastTitle = document.querySelector(".toast-title");
const toastMessage = document.getElementById("toastMessage");

// Project info DOM
const projectTitle = document.getElementById("project-title");
const projectStatus = document.getElementById("project-status");
const projectDescription = document.getElementById("project-description");
const projectBudget = document.getElementById("project-budget");
const projectDeadline = document.getElementById("project-deadline");
const projectClient = document.getElementById("project-client");

// ===============================
// State
// ===============================
let uploadedFile = null;
let uploadedFileId = null;
let isSubmitting = false;
let project = null;

// ===============================
// Initialize
// ===============================
document.addEventListener("DOMContentLoaded", async function () {
  if (!form) {
    console.error(" Form element not found. Check your HTML IDs.");
    return;
  }
  setupEventListeners();
  updateSubmitButton();
  await fetchProjectData();
});

// ===============================
// Fetch project details
// ===============================
async function fetchProjectData() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId =
    urlParams.get("projectId") ||
    urlParams.get("id") ||
    localStorage.getItem("selectedProjectId");

  if (!projectId) {
    showToast("Error", "No project selected.");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/projects/${projectId}`
    );
    if (!response.ok) throw new Error("Failed to fetch project");
    project = await response.json();
    console.log(" Loaded project:", project);

    // 🟩 Display project details on the page
    if (projectTitle)
      projectTitle.textContent = project.title || "Untitled Project";
    if (projectStatus)
      projectStatus.textContent = project.status || "Pending";
    if (projectDescription)
      projectDescription.textContent =
        project.description || "No description available.";
    if (projectBudget)
      projectBudget.textContent = project.budget
        ? `Budget: KES ${project.budget}`
        : "Budget not specified.";
    if (projectDeadline)
      projectDeadline.textContent = project.deadline
        ? `Deadline: ${new Date(project.deadline).toLocaleDateString()}`
        : "No deadline provided.";
    if (projectClient)
      projectClient.textContent =
        project.createdBy?.firstName || "Unknown Client";
  } catch (err) {
    console.error(" Error fetching project:", err);
    showToast("Error", "Unable to load project details.");
  }
}

// ===============================
// Event Listeners
// ===============================
function setupEventListeners() {
  form.addEventListener("submit", handleSubmit);

  if (fileUpload) fileUpload.addEventListener("click", () => fileInput.click());
  if (fileInput)
    fileInput.addEventListener("change", handleFileUploadWithValidation);
  if (removeFileBtn) removeFileBtn.addEventListener("click", removeFile);

  if (proposalTextarea)
    proposalTextarea.addEventListener("input", updateSubmitButton);
  if (bidAmountInput)
    bidAmountInput.addEventListener("input", updateSubmitButton);
  if (completionTimeSelect)
    completionTimeSelect.addEventListener("change", updateSubmitButton);
}

// ===============================
// File Upload Handling
// ===============================
async function handleFileUploadWithValidation(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!validateFileSize(file)) {
    showToast("File Too Large", "Please select a file smaller than 10MB.");
    resetFileUI();
    return;
  }

  if (!validateFileType(file)) {
    showToast("Invalid File Type", "Allowed: PDF, DOC, DOCX, JPG, PNG");
    resetFileUI();
    return;
  }

  uploadedFile = file;

  const formData = new FormData();
  formData.append("file", uploadedFile);

  try {
    const res = await fetch("http://localhost:3001/upload/project", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("File upload failed");
    const data = await res.json();
    uploadedFileId = data.fileId;

    if (fileName) fileName.textContent = file.name;
    if (fileUpload) fileUpload.style.display = "none";
    if (filePreview) filePreview.style.display = "block";
  } catch (err) {
    console.error(" File upload error:", err);
    showToast("Error", "File upload failed.");
    resetFileUI();
  }
}

function removeFile() {
  uploadedFile = null;
  uploadedFileId = null;
  resetFileUI();
}

function resetFileUI() {
  if (fileInput) fileInput.value = "";
  if (fileUpload) fileUpload.style.display = "block";
  if (filePreview) filePreview.style.display = "none";
  if (fileName) fileName.textContent = "";
}

// ===============================
// Form Validation
// ===============================
function updateSubmitButton() {
  const proposal = proposalTextarea?.value.trim();
  const bidAmount = bidAmountInput?.value.trim();
  const completionTime = completionTimeSelect?.value;

  const isValid =
    proposal &&
    bidAmount &&
    !isNaN(bidAmount) &&
    Number(bidAmount) > 0 &&
    completionTime &&
    !isSubmitting;

  if (submitBtn) submitBtn.disabled = !isValid;
}

// ===============================
// Form Submission
// ===============================
async function handleSubmit(event) {
  event.preventDefault();
  if (isSubmitting) return;

  if (!project) {
    showToast("Error", "Project details not loaded.");
    return;
  }

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user._id) {
    showToast("Error", "You must be logged in as a freelancer.");
    return;
  }

  isSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = "Submitting...";

  try {
    const body = {
      projectId: project._id,
      freelancerId: user._id,
      proposal: proposalTextarea.value.trim(),
      bidAmount: bidAmountInput.value.trim(),
      completionTime: completionTimeSelect.value,
      fileId: uploadedFileId,
    };

    const res = await fetch("http://localhost:3000/api/project-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to submit proposal");

    showToast(
      "Request Submitted",
      `Your request for "${project.title}" has been submitted successfully.`
    );
    resetForm();
  } catch (error) {
    console.error(" Submit error:", error);
    showToast("Error", "Failed to submit proposal.");
  } finally {
    isSubmitting = false;
    if (submitText) submitText.textContent = "Submit Proposal";
    updateSubmitButton();
  }
}

// ===============================
// Reset Form
// ===============================
function resetForm() {
  if (proposalTextarea) proposalTextarea.value = "";
  if (bidAmountInput) bidAmountInput.value = "";
  if (completionTimeSelect) completionTimeSelect.value = "";
  removeFile();
}

// ===============================
// Toast Notifications
// ===============================
function showToast(title, message, duration = 4000) {
  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = message;

  if (!toast) return;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// ===============================
// Validation Helpers
// ===============================
function validateFileSize(file, maxSizeMB = 10) {
  return file.size <= maxSizeMB * 1024 * 1024;
}

function validateFileType(
  file,
  allowed = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]
) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  return allowed.includes(ext);
}
