class MissCheckerChatbot {
  constructor() {
    this.chatInput = document.getElementById("chatInput");
    this.sendButton = document.getElementById("sendButton");
    this.chatMessages = document.getElementById("chatMessages");
    this.errorAlert = document.getElementById("errorAlert");
    this.recommendationTags = document.getElementById("recommendationTags");

    this.isLoading = false;

    // Netlify function endpoint
    this.apiEndpoint = "/.netlify/functions/chat";

    // Essential log for debugging deployment issues
    console.log("MissChecker Chatbot initialized");
    console.log("API Endpoint:", this.apiEndpoint);

    this.initializeEventListeners();
    this.setupAutoResize();
  }

  initializeEventListeners() {
    // Send message on button click
    this.sendButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleSendMessage();
    });

    // Send message on Enter key (Shift+Enter for new line)
    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // Handle recommendation tag clicks
    this.recommendationTags.addEventListener("click", (e) => {
      if (e.target.classList.contains("recommendation-tag")) {
        this.chatInput.value = e.target.textContent;
        this.adjustTextareaHeight();
        this.validateInput();
        this.chatInput.focus();
      }
    });

    // Input validation
    this.chatInput.addEventListener("input", () => {
      this.validateInput();
    });

    // Initial validation
    this.validateInput();
  }

  setupAutoResize() {
    this.chatInput.addEventListener("input", () => {
      this.adjustTextareaHeight();
    });
  }

  adjustTextareaHeight() {
    this.chatInput.style.height = "auto";
    const newHeight = Math.min(this.chatInput.scrollHeight, 120);
    this.chatInput.style.height = newHeight + "px";

    if (this.chatInput.scrollHeight > 120) {
      this.chatInput.style.overflowY = "auto";
    } else {
      this.chatInput.style.overflowY = "hidden";
    }
  }

  validateInput() {
    const message = this.chatInput.value.trim();
    const isValid = message.length > 0 && message.length <= 285;

    this.sendButton.disabled = !isValid || this.isLoading;

    if (message.length > 285) {
      this.showError("Message too long. Please keep it under 285 characters.");
    } else {
      this.hideError();
    }
  }

  async handleSendMessage() {
    const message = this.chatInput.value.trim();

    if (!message || this.isLoading) return;

    if (message.length > 285) {
      this.showError("Message too long. Please keep it under 285 characters.");
      return;
    }

    // Add user message to chat
    this.addMessage(message, "user");

    // Clear input and reset height
    this.chatInput.value = "";
    this.adjustTextareaHeight();
    this.validateInput();

    // Show loading state
    this.setLoadingState(true);

    try {
      const response = await this.sendToAPI(message);
      this.addMessage(response, "bot");
    } catch (error) {
      // Essential error logging for debugging
      console.error("API Error:", error);
      this.addMessage(
        "I apologize, but I encountered an error processing your request. Please try again later.",
        "error"
      );
      this.showError(
        "Failed to get response. Please check your connection and try again."
      );
    } finally {
      this.setLoadingState(false);
    }
  }

  async sendToAPI(message) {
    try {
      // Essential log for Netlify function calls
      console.log("Calling Netlify function:", this.apiEndpoint);

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
        }),
      });

      // Essential log for debugging API issues
      if (!response.ok) {
        console.error("Netlify function error - Status:", response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Successful response received");

      return data.response || data.message || "No response received.";
    } catch (error) {
      // Essential error logging
      console.error("Fetch error:", error.message);
      throw error;
    }
  }

  addMessage(text, type) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", type);

    // Format bot responses for better readability
    if (type === "bot") {
      const formattedText = this.formatBotResponse(text);
      messageDiv.innerHTML = formattedText;
    } else {
      messageDiv.textContent = text;
    }

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatBotResponse(text) {
    if (!text || typeof text !== "string") {
      return text;
    }

    // Clean up the text formatting
    let formatted = text
      // Handle escaped quotes
      .replace(/\\"/g, '"')
      // Convert double line breaks to paragraph breaks
      .replace(/\n\n/g, "</p><p>")
      // Convert single line breaks to <br>
      .replace(/\n/g, "<br>")
      // Handle bullet points with dashes
      .replace(/^- /gm, "• ")
      // Handle bullet points after line breaks
      .replace(/<br>- /g, "<br>• ");

    // Wrap in paragraph tags if there are paragraph breaks
    if (formatted.includes("</p><p>")) {
      formatted = "<p>" + formatted + "</p>";
    }

    // Highlight important safety terms
    formatted = formatted
      .replace(
        /\b(cancer|toxic|harmful|dangerous|avoid|banned)\b/gi,
        '<strong style="color: #e91e63;">$1</strong>'
      )
      .replace(
        /\b(safe|safer|recommended|choose|certified)\b/gi,
        '<strong style="color: #6ab04c;">$1</strong>'
      );

    return formatted;
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    this.sendButton.disabled = loading;
    this.validateInput();

    if (loading) {
      const loadingDiv = document.createElement("div");
      loadingDiv.classList.add("message", "loading-message");
      loadingDiv.id = "loadingMessage";
      loadingDiv.innerHTML = `
                <span>Analyzing ingredient safety...</span>
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
      this.chatMessages.appendChild(loadingDiv);
      this.scrollToBottom();
    } else {
      const loadingMessage = document.getElementById("loadingMessage");
      if (loadingMessage) {
        loadingMessage.remove();
      }
    }
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.style.display = "block";
    setTimeout(() => this.hideError(), 5000);
  }

  hideError() {
    this.errorAlert.style.display = "none";
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    new MissCheckerChatbot();
    console.log("MissChecker Chatbot loaded successfully");
  } catch (error) {
    console.error("Failed to initialize MissChecker Chatbot:", error);
  }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});
