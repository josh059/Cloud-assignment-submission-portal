(function () {
  const config = window.PORTAL_CONFIG || {};
  const apiBaseUrl = (config.apiBaseUrl || "").replace(/\/$/, "");
  const demoKey = "cbwp-submissions";
  const maxFileBytes = 6 * 1024 * 1024;

  const elements = {
    apiStatus: document.getElementById("apiStatus"),
    tabs: document.querySelectorAll(".tab"),
    panels: {
      student: document.getElementById("studentPanel"),
      lecturer: document.getElementById("lecturerPanel"),
      cloud: document.getElementById("cloudPanel")
    },
    uploadForm: document.getElementById("uploadForm"),
    assignmentFile: document.getElementById("assignmentFile"),
    dropZone: document.getElementById("dropZone"),
    fileTitle: document.getElementById("fileTitle"),
    fileMeta: document.getElementById("fileMeta"),
    submitButton: document.getElementById("submitButton"),
    uploadMessage: document.getElementById("uploadMessage"),
    submissionsBody: document.getElementById("submissionsBody"),
    emptyState: document.getElementById("emptyState"),
    refreshButton: document.getElementById("refreshButton"),
    searchInput: document.getElementById("searchInput"),
    courseFilter: document.getElementById("courseFilter"),
    totalCount: document.getElementById("totalCount"),
    courseCount: document.getElementById("courseCount")
  };

  let submissions = [];

  function setApiStatus() {
    if (apiBaseUrl) {
      elements.apiStatus.classList.add("connected");
      elements.apiStatus.lastChild.textContent = " API connected";
    }
  }

  function activateTab(name) {
    elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    Object.entries(elements.panels).forEach(([key, panel]) => panel.classList.toggle("active", key === name));
  }

  function showMessage(message, isError) {
    elements.uploadMessage.textContent = message;
    elements.uploadMessage.classList.toggle("error", Boolean(isError));
    elements.uploadMessage.style.display = "block";
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 KB";
    const units = ["bytes", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function formatDate(value) {
    if (!value) return "Just now";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.readAsDataURL(file);
    });
  }

  function getDemoSubmissions() {
    const saved = localStorage.getItem(demoKey);
    if (saved) return JSON.parse(saved);

    const starter = [
      {
        submissionId: "demo-001",
        studentName: "Ama Mensah",
        studentId: "CBWP-001",
        course: "Cloud Computing",
        assignmentTitle: "Serverless Architecture Report",
        fileName: "serverless-architecture.pdf",
        fileSize: 485120,
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        downloadUrl: ""
      },
      {
        submissionId: "demo-002",
        studentName: "Kofi Addo",
        studentId: "CBWP-014",
        course: "Distributed Systems",
        assignmentTitle: "Storage Design Notes",
        fileName: "storage-design.docx",
        fileSize: 219340,
        submittedAt: new Date(Date.now() - 3600000).toISOString(),
        downloadUrl: ""
      }
    ];
    localStorage.setItem(demoKey, JSON.stringify(starter));
    return starter;
  }

  async function apiRequest(path, options) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "The cloud API returned an error.");
    }
    return data;
  }

  async function createSubmission(payload) {
    if (!apiBaseUrl) {
      const next = {
        ...payload,
        submissionId: `demo-${Date.now()}`,
        submittedAt: new Date().toISOString(),
        downloadUrl: ""
      };
      const all = [next, ...getDemoSubmissions()];
      localStorage.setItem(demoKey, JSON.stringify(all));
      return next;
    }

    return apiRequest("/submissions", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function loadSubmissions() {
    if (!apiBaseUrl) {
      submissions = getDemoSubmissions();
    } else {
      const data = await apiRequest("/submissions", { method: "GET" });
      submissions = data.submissions || [];
    }
    renderSubmissions();
  }

  async function getDownloadUrl(submissionId) {
    if (!apiBaseUrl) return "";
    const data = await apiRequest(`/submissions/${encodeURIComponent(submissionId)}/download`, { method: "GET" });
    return data.downloadUrl;
  }

  function updateCourseFilter(filteredCourses) {
    const current = elements.courseFilter.value;
    elements.courseFilter.innerHTML = '<option value="">All courses</option>';
    filteredCourses.forEach((course) => {
      const option = document.createElement("option");
      option.value = course;
      option.textContent = course;
      elements.courseFilter.appendChild(option);
    });
    elements.courseFilter.value = filteredCourses.includes(current) ? current : "";
  }

  function renderSubmissions() {
    const query = elements.searchInput.value.trim().toLowerCase();
    const course = elements.courseFilter.value;
    const courses = Array.from(new Set(submissions.map((item) => item.course).filter(Boolean))).sort();
    updateCourseFilter(courses);

    const visible = submissions.filter((item) => {
      const haystack = `${item.studentName} ${item.studentId} ${item.course} ${item.assignmentTitle} ${item.fileName}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!course || item.course === course);
    });

    elements.submissionsBody.innerHTML = "";
    visible.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(item.studentName)}</strong><br><small>${escapeHtml(item.studentId)}</small></td>
        <td>${escapeHtml(item.assignmentTitle)}</td>
        <td>${escapeHtml(item.course)}</td>
        <td>${formatDate(item.submittedAt)}</td>
        <td>${escapeHtml(item.fileName)}<br><small>${formatBytes(item.fileSize)}</small></td>
        <td><button class="ghost-button" type="button" data-download="${escapeHtml(item.submissionId)}">Download</button></td>
      `;
      elements.submissionsBody.appendChild(row);
    });

    elements.emptyState.style.display = visible.length ? "none" : "block";
    elements.totalCount.textContent = String(submissions.length);
    elements.courseCount.textContent = String(courses.length);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function updateFileLabel(file) {
    if (!file) {
      elements.fileTitle.textContent = "Choose a PDF, DOC, or DOCX file";
      elements.fileMeta.textContent = "Maximum recommended size: 6 MB for API Gateway JSON upload.";
      return;
    }
    elements.fileTitle.textContent = file.name;
    elements.fileMeta.textContent = `${formatBytes(file.size)} selected`;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(elements.uploadForm);
    const file = elements.assignmentFile.files[0];

    if (!file) {
      showMessage("Please select an assignment file before uploading.", true);
      return;
    }

    const allowed = [".pdf", ".doc", ".docx"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(extension)) {
      showMessage("Only PDF, DOC, and DOCX files are accepted.", true);
      return;
    }

    if (file.size > maxFileBytes) {
      showMessage("Please choose a file smaller than 6 MB.", true);
      return;
    }

    elements.submitButton.disabled = true;
    elements.submitButton.textContent = "Uploading...";

    try {
      const fileContent = await toBase64(file);
      await createSubmission({
        studentName: formData.get("studentName"),
        studentId: formData.get("studentId"),
        course: formData.get("course"),
        assignmentTitle: formData.get("assignmentTitle"),
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileContent
      });
      elements.uploadForm.reset();
      updateFileLabel(null);
      showMessage("Assignment uploaded successfully.");
      await loadSubmissions();
      activateTab("lecturer");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      elements.submitButton.disabled = false;
      elements.submitButton.textContent = "Upload assignment";
    }
  }

  function bindEvents() {
    elements.tabs.forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
    elements.assignmentFile.addEventListener("change", () => updateFileLabel(elements.assignmentFile.files[0]));
    elements.uploadForm.addEventListener("submit", handleSubmit);
    elements.uploadForm.addEventListener("reset", () => setTimeout(() => updateFileLabel(null), 0));
    elements.refreshButton.addEventListener("click", loadSubmissions);
    elements.searchInput.addEventListener("input", renderSubmissions);
    elements.courseFilter.addEventListener("change", renderSubmissions);

    ["dragenter", "dragover"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.add("dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.remove("dragging");
      });
    });

    elements.dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files[0];
      if (!file) return;
      const transfer = new DataTransfer();
      transfer.items.add(file);
      elements.assignmentFile.files = transfer.files;
      updateFileLabel(file);
    });

    elements.submissionsBody.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-download]");
      if (!button) return;

      const submissionId = button.dataset.download;
      const submission = submissions.find((item) => item.submissionId === submissionId);
      if (!apiBaseUrl) {
        alert("Demo mode stores metadata only. Deploy the Lambda API to download uploaded files from S3.");
        return;
      }

      button.disabled = true;
      button.textContent = "Opening...";
      try {
        const url = submission.downloadUrl || await getDownloadUrl(submissionId);
        window.open(url, "_blank", "noopener");
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
        button.textContent = "Download";
      }
    });
  }

  setApiStatus();
  bindEvents();
  loadSubmissions();
})();
