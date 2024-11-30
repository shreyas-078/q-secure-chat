document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("signupForm");
  const errorMessage = document.getElementById("error-message");

  signupForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const data = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    // Password strength check
    if (!isStrongPassword(data.password)) {
      errorMessage.textContent = "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
      errorMessage.style.display = "block";
      setTimeout(() => {
        errorMessage.style.display = "none";
      }, 5000);
      return;
    }

    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.status === "success") {
        window.location.href = "/signup-complete";
      } else {
        if (result.message === "Username already exists") {
          errorMessage.textContent = "Username already taken. Please choose another one.";
        } else if (result.message === "Email already exists") {
          errorMessage.textContent = "A User with this Email already exists. Please use another email, or if the email is yours, try logging in.";
        } else {
          errorMessage.textContent = "Signup failed. Please try again.";
        }
        errorMessage.style.display = "block";
        setTimeout(() => {
          errorMessage.style.display = "none";
        }, 5000);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again later.");
    }
  });

  function isStrongPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }
});