document.addEventListener("DOMContentLoaded", function () {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");

  forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(forgotPasswordForm);
    const data = {
      email: formData.get("email"),
    };

    try {
      const response = await fetch("/forgot_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.status === "success") {
        successMessage.textContent = result.message;
        successMessage.style.display = "block";
        errorMessage.style.display = "none";
      } else {
        errorMessage.textContent = result.message;
        errorMessage.style.display = "block";
        successMessage.style.display = "none";
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
    }
  });
});