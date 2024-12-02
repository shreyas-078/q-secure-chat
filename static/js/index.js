document.addEventListener('DOMContentLoaded', function () {
  const searchIcon = document.getElementById('search-icon');
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const userChats = document.getElementById('user-chats');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const hamburgerMenu = document.getElementById('hamburger-menu');
  const logoutBtn = document.getElementById('logout-btn');
  const chatPanel = document.getElementById('chat-panel');

  // Toggle the visibility of the hamburger menu when clicking the hamburger icon
  hamburgerIcon.addEventListener('click', function () {
    hamburgerMenu.classList.toggle('d-none');
  });

  // Log out the user when the logout button is clicked
  logoutBtn.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent default link behavior

    fetch('/logout', {
      method: 'GET',
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

  userChats.addEventListener('click', function (event) {
    const friendDrawer = event.target.closest('.friend-drawer');
    if (friendDrawer) {
      const chatPartnerId = friendDrawer.getAttribute('data-chat-partner-id');
      loadChat(chatPartnerId);
    }
  });

  function loadChat(chatPartnerId) {
    fetch(`/get_chat/${chatPartnerId}`)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        if (data.status === 'success') {
          // Update the chat header with the selected user's username
          document.querySelector('.profile-tray').classList.remove('d-none');
          const chatPartnerUsername = data.username; // Assuming the API returns the chat partner's username
          document.querySelector('.profile-tray h5').textContent = chatPartnerUsername;

          // Clear current chat panel
          chatPanel.innerHTML = '';

          // Populate with messages
          const messages = data.messages;
          if (messages.length > 0) {
            const chatContent = document.createElement('div');
            chatContent.classList.add('chat-partner-chats');

            messages.forEach(message => {
              const messageBubbleContainerParent = document.createElement('div');
              const messageBubbleContainer = document.createElement('div');
              const messageBubble = document.createElement('div');
              messageBubbleContainer.appendChild(messageBubble);
              messageBubbleContainerParent.appendChild(messageBubbleContainer);

              messageBubbleContainerParent.classList.add('row', 'no-gutters');
              if (message.sender_id === currentUser.id.toString()) {
                messageBubble.classList.add('chat-bubble', 'chat-bubble--right');
                messageBubbleContainer.classList.add('col-md-3', 'offset-md-9');
              } else {
                messageBubble.classList.add('chat-bubble', 'chat-bubble--left');
                messageBubbleContainer.classList.add('col-md-3');
              }
              messageBubble.textContent = message.content;
              chatContent.appendChild(messageBubbleContainerParent);
            });

            chatPanel.appendChild(chatContent);
          } else {
            chatPanel.innerHTML = '<p>No messages yet. Start a conversation!</p>';
          }

          // Add input field for new messages
          addChatBox(chatPanel, chatPartnerId);
        } else {
          alert('Failed to load chat. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error fetching chat:', error);
        alert('Error fetching chat. Please try again.');
      });
  }

  function addChatBox(chatPanel, chatPartnerId) {
    const chatBoxTray = document.createElement('div');
    chatBoxTray.classList.add('row');
    chatBoxTray.innerHTML = `
      <div class="col-12">
        <div class="chat-box-tray">
          <i class="material-icons" id="emoji">sentiment_very_satisfied</i>
          <input type="text" id="new-message" placeholder="Type your message here..." />
          <i class="material-icons" id="send-message">send</i>
        </div>
      </div>
    `;

    chatPanel.appendChild(chatBoxTray);

    // Attach event listener to send button
    const sendMessageButton = chatBoxTray.querySelector('#send-message');
    sendMessageButton.addEventListener('click', function () {
      const messageContent = document.getElementById('new-message').value.trim();
      if (messageContent) {
        sendMessage(chatPartnerId, messageContent);
      }
    });
  }

  function sendMessage(receiverId, content) {
    fetch('/send_message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receiver_id: receiverId, content }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          // Optionally refresh chat
          loadChat(receiverId);
        } else {
          alert('Failed to send message. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
      });
  }

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
          console.log(data);

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

  function addChatUser(user) {
    const chatDiv = document.createElement('div');
    chatDiv.classList.add('friend-drawer', 'friend-drawer--onhover');
    chatDiv.setAttribute('data-chat-partner-id', user.id);
    document.querySelector('.no-convos-box').classList.add('d-none');

    const img = document.createElement('img');
    img.classList.add('profile-image');
    img.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'; // Placeholder image
    chatDiv.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    const h6 = document.createElement('h6');
    h6.textContent = user.username;
    const p = document.createElement('p');
    p.classList.add('text-muted');
    p.textContent = 'No messages yet';
    textDiv.appendChild(h6);
    textDiv.appendChild(p);
    chatDiv.appendChild(textDiv);

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('time', 'text-muted', 'small');
    timeSpan.textContent = 'No messages yet';
    chatDiv.appendChild(timeSpan);

    chatDiv.addEventListener('click', () => {
      loadChat(user.id); // Load chat for the selected user
    });

    userChats.appendChild(chatDiv);
  }
});
