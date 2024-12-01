document.addEventListener('DOMContentLoaded', function () {
  const searchIcon = document.getElementById('search-icon');
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const userChats = document.getElementById('user-chats');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const logoutBtn = document.getElementById('logout-btn');

  // Toggle the visibility of the hamburger menu when clicking the hamburger icon
  hamburgerIcon.addEventListener('click', function () {
    hamburgerMenu.classList.toggle('d-none');
  });

  // Log out the user when the logout button is clicked
  logoutBtn.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default link behavior

    fetch('/logout', {
      method: 'POST',
    })
      .then(response => {
        if (response.ok) {
          window.location.href = '/login'; // Redirect to login page after logout
        } else {
          alert('Error logging out. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error during logout:', error);
        alert('Error logging out. Please try again.');
      });
  });

  // Toggle the visibility of the search panel when clicking the search icon
  searchIcon.addEventListener('click', function () {
    searchPanel.classList.toggle('d-none');
  });

  // Handle searching users
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim();
    if (query) {
      // Make an AJAX request to the /search_users route
      fetch(`/search_users?query=${query}`)
        .then(response => response.json())
        .then(data => {
          // Clear previous results
          searchResults.innerHTML = '';

          if (data.length > 0) {
            // Display search results
            data.forEach(user => {
              const li = document.createElement('li');
              li.textContent = user.username;
              li.addEventListener('click', function () {
                addChatUser(user);
                searchPanel.classList.add('d-none');  // Hide the search panel
                searchInput.value = '';  // Clear the search input
              });
              searchResults.appendChild(li);
            });
          } else {
            searchResults.innerHTML = '<li>No users found</li>';
          }
        })
        .catch(error => {
          console.error('Error fetching search results:', error);
        });
    } else {
      // Clear search results if query is empty
      searchResults.innerHTML = '';
    }
  });

  // Add a user to the chat sidebar
  function addChatUser(user) {
    const chatDiv = document.createElement('div');
    chatDiv.classList.add('friend-drawer', 'friend-drawer--onhover');
    chatDiv.setAttribute('data-chat-partner-id', user.id);

    const img = document.createElement('img');
    img.classList.add('profile-image');
    img.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';  // Placeholder image
    chatDiv.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    const h6 = document.createElement('h6');
    h6.textContent = user.username;  // Display user's name
    const p = document.createElement('p');
    p.classList.add('text-muted');
    p.textContent = 'No messages yet';  // Default message placeholder
    textDiv.appendChild(h6);
    textDiv.appendChild(p);
    chatDiv.appendChild(textDiv);

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('time', 'text-muted', 'small');
    timeSpan.textContent = 'No messages yet';
    chatDiv.appendChild(timeSpan);

    userChats.appendChild(chatDiv);
  }
});
