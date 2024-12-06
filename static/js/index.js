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
  const chatRelatedInfo = document.getElementById('chat-related-info');
  const chatOptionsMenu = document.getElementById('chat-related-options-menu');
  const deleteChatOption = document.getElementById('delete-chat');
  const encryptionTechniqueOption = document.getElementById('encryption-technique');
  const socket = io.connect('http://192.168.0.214:8000'); // Connect to the server

  userChats.addEventListener('click', function (event) {
    const friendDrawer = event.target.closest('.friend-drawer');
    if (friendDrawer) {
      friendDrawer.querySelector('.text p').classList.remove('new-message');
      friendDrawer.querySelector('.time').classList.remove('new-message');
    }
  });

  // Toggle the chat options menu when clicking the chat-related-info icon
  chatRelatedInfo.addEventListener('click', function () {
    chatOptionsMenu.classList.toggle('d-none');
  });

  // Handle searching users
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim();
    if (query) {
      // Make an AJAX request to the /search_users route
      const usersToExclude = Array.from(document.querySelectorAll('.friend-drawer')).map(friendDrawer => friendDrawer.dataset.chatPartnerId);
      fetch(`/search_users?query=${query}&exclude_users=${usersToExclude.join(',')}`)
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

  // Function to format the timestamp as "YYYY-MM-DD HH:mm:ss"
  function formatTimestamp() {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Add leading zero for single digit months
    const day = String(now.getUTCDate()).padStart(2, '0'); // Add leading zero for single digit days
    const hours = String(now.getUTCHours()).padStart(2, '0'); // Add leading zero for single digit hours
    const minutes = String(now.getUTCMinutes()).padStart(2, '0'); // Add leading zero for single digit minutes
    const seconds = String(now.getUTCSeconds()).padStart(2, '0'); // Add leading zero for single digit seconds

    // Return the formatted string
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Close the menu if the user clicks outside the menu
  document.addEventListener('click', function (event) {
    if (!chatRelatedInfo.contains(event.target) && !chatOptionsMenu.contains(event.target)) {
      chatOptionsMenu.classList.add('d-none');
    }
  });

  deleteChatOption.addEventListener('click', function () {
    const confirmation = confirm('Are you sure you want to delete this chat? (It will be deleted for both the users)');
    if (confirmation) {
      const username = document.querySelector('.profile-tray h5').textContent;
      fetch(`/delete_chat/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            alert('Chat deleted successfully');
            window.location.reload(); // Reload the page to reflect the changes
          } else {
            alert('Error: ' + data.message);
          }
        })
        .catch(error => {
          console.error('Error during chat deletion:', error);
          alert('There was an error while deleting the chat.');
        });
    }
  });

  socket.on('chat_deleted', function (data) {
    const chatPartnerId = data.idToRemove;

    // Find the chat for the deleted user
    const chatToDelete = document.querySelector(`div[data-chat-partner-id='${chatPartnerId}']`);

    // If this was the active chat, show a message saying the chat was deleted
    const chatPartnerUsername = document.querySelector('.profile-tray h5').textContent;
    if (chatPartnerUsername === document.querySelector(`div[data-chat-partner-id='${chatPartnerId}'] h6`).textContent) {
      document.querySelector('#chat-panel').innerHTML = '<p>This chat has been deleted.</p>';
    }

    if (!chatToDelete) {
      return;
    }

    if (chatToDelete && chatToDelete.nextElementSibling && chatToDelete.nextElementSibling.tagName.toLowerCase() === 'hr') {
      chatToDelete.nextElementSibling.remove(); // Remove the hr element
      chatToDelete.remove();  // Remove the chat from the chat list
    }
  });

  // Handle the encryption technique option
  encryptionTechniqueOption.addEventListener('click', function () {
    alert('Encryption technique: Lattice-based encryption');
  });

  socket.on('update_message', function (data) {
    const { sender_id, receiver_id, content } = data;
    if (sender_id === currentUser.id) {
      document.querySelectorAll('.friend-drawer').forEach(friendDrawer => {
        if (friendDrawer.getAttribute('data-chat-partner-id') === receiver_id) {
          friendDrawer.querySelector('.text p').textContent = content;
          friendDrawer.querySelector('.time').textContent = formatTimestamp();
          return;
        };
      });
    }
    else if (receiver_id === currentUser.id) {
      document.querySelectorAll('.friend-drawer').forEach(friendDrawer => {
        if (friendDrawer.getAttribute('data-chat-partner-id') === sender_id) {
          const username = friendDrawer.querySelector('.text h6').textContent;
          friendDrawer.querySelector('.text p').textContent = content;
          friendDrawer.querySelector('.time').textContent = formatTimestamp();
          if (document.querySelector('.profile-tray h5').textContent !== username) {
            friendDrawer.querySelector('.text p').classList.add('new-message');
            friendDrawer.querySelector('.time').classList.add('new-message');
          }
        }
      });
    }
  });

  socket.on('new_chat', function (data) {
    if (data.id === currentUser.id || data.username === currentUser.username || data.rec_id !== currentUser.id) {
      return;
    }
    addChatUser(data);
  });

  socket.on('new_message', function (data) {
    const { message_id, sender_id, content } = data;

    if (document.querySelector('.chat-panel p')) {
      document.querySelector('.chat-panel p').remove(); // Remove the placeholder message
      const chatPartnerChats = document.createElement('div');
      chatPartnerChats.classList.add('chat-partner-chats');
      document.getElementById('chat-panel').insertBefore(chatPartnerChats, document.querySelector('.chat-box-tray').parentElement.parentElement);
    }

    // Get the current chat partner's username
    const chatPartnerUsername = document.querySelector('.profile-tray h5').textContent;
    const currentUserId = currentUser.id;

    // Find the user ID of the chat partner from the friend list
    const chatPartner = Array.from(document.querySelectorAll('.friend-drawer'))
      .find(friendDrawer => {
        const username = friendDrawer.querySelector('.text h6').textContent;
        return username === chatPartnerUsername;
      });

    if (chatPartner) {
      // get their user ID
      const chatPartnerId = chatPartner.getAttribute('data-chat-partner-id');

      // Update the latest message and timestamp in the conversation list
      const chatPartnerTextDiv = chatPartner.querySelector('.text');
      const p = chatPartnerTextDiv.querySelector('p');
      const time = chatPartner.querySelector('.time');

      p.textContent = content;  // Latest message content
      time.textContent = formatTimestamp();  // Update timestamp with the formatted value
    } else {
      console.error('Chat partner not found in the conversation list');
    }

    const chatPartnerId = chatPartner.getAttribute('data-chat-partner-id');

    // If the message is for the current room, update the UI inside the chat panel
    const roomName = `chat_${Math.min(currentUserId, chatPartnerId)}_${Math.max(currentUserId, chatPartnerId)}`;
    if (roomName === `chat_${Math.min(currentUserId, chatPartnerId)}_${Math.max(currentUserId, chatPartnerId)}`) {
      const messageBubbleContainerParent = document.createElement('div');
      const messageBubbleContainer = document.createElement('div');
      const messageBubble = document.createElement('div');
      messageBubbleContainer.appendChild(messageBubble);
      messageBubbleContainerParent.appendChild(messageBubbleContainer);

      messageBubbleContainerParent.classList.add('row', 'no-gutters');
      if (sender_id === currentUser.id) {
        messageBubble.classList.add('chat-bubble', 'chat-bubble--right');
        messageBubbleContainer.classList.add('col-md-3', 'offset-md-9');
      } else {
        messageBubble.classList.add('chat-bubble', 'chat-bubble--left');
        messageBubbleContainer.classList.add('col-md-3');
      }

      messageBubble.textContent = content;
      document.querySelector('.chat-partner-chats').appendChild(messageBubbleContainerParent);

      // Scroll to the bottom of the chat panel
      if (document.querySelector('.chat-partner-chats')) {
        document.querySelector('.chat-partner-chats').scrollTo(0, document.querySelector('.chat-partner-chats').scrollHeight);
      }
    }
  });

  // Toggle the visibility of the hamburger menu when clicking the hamburger icon
  hamburgerIcon.addEventListener('click', function () {
    hamburgerMenu.classList.toggle('d-none');
  });

  // Close the hamburget menu if the user clicks outside the menu
  document.addEventListener('click', function (event) {
    if (!hamburgerIcon.contains(event.target) && !hamburgerMenu.contains(event.target)) {
      hamburgerMenu.classList.add('d-none');
    }
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
    document.getElementById('search-input').value = "";  // Clear the search input
    document.getElementById('search-results').innerHTML = "";  // Clear the search results
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
        if (data.status === 'success') {
          // Update the chat header with the selected user's username
          document.querySelector('.profile-tray').classList.remove('d-none');
          const chatPartnerUsername = data.username;
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
            chatContent.scrollTo(0, chatContent.scrollHeight); // Scroll to the bottom of the chat panel
          } else {
            chatPanel.innerHTML = '<p>No messages yet. Start a conversation!</p>';
          }

          // Add input field for new messages
          addChatBox(chatPanel, chatPartnerId);
          // After the chat loads, join the corresponding room
          socket.emit('join_chat', { chat_partner_id: chatPartnerId });
        } else {
          alert('Failed to load chat. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error fetching chat:', error);
        alert('Error fetching chat. Please try again.');
      });
  }

  function sendMessage(chatPartnerId, content) {
    socket.emit('send_message', {
      receiver_id: chatPartnerId,
      content: content,
    });
  }

  function addChatBox(chatPanel, chatPartnerId) {
    const chatBoxTray = document.createElement('div');
    chatBoxTray.classList.add('row');
    chatBoxTray.innerHTML = `
    <div class="col-12">
      <div class="chat-box-tray">
        <input type="text" id="new-message" placeholder="Type your message here..." />
        <i class="material-icons" id="send-message">send</i>
      </div>
    </div>
  `;

    chatPanel.appendChild(chatBoxTray);

    // Get references to the input and send button
    const inputField = chatBoxTray.querySelector('#new-message');
    const sendMessageButton = chatBoxTray.querySelector('#send-message');

    // Attach event listener to send button
    sendMessageButton.addEventListener('click', function () {
      const messageContent = inputField.value.trim();
      if (messageContent) {
        sendMessage(chatPartnerId, messageContent);
        inputField.value = ''; // Clear the input after sending
      }
    });

    // Attach event listener to the input field to send message on Enter key press
    inputField.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        const messageContent = inputField.value.trim();
        if (messageContent) {
          sendMessage(chatPartnerId, messageContent);
          inputField.value = ''; // Clear the input after sending
        }
      }
    });
  }

  function addChatUser(user) {
    const chatDiv = document.createElement('div');
    chatDiv.classList.add('friend-drawer', 'friend-drawer--onhover');
    chatDiv.setAttribute('data-chat-partner-id', user.id);

    if (document.querySelector('.no-convos-box')) {
      document.querySelector('.no-convos-box').classList.add('d-none');
    }

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

    chatDiv.addEventListener('click', async () => {
      loadChat(user.id); // Load chat for the selected user
    });

    userChats.appendChild(chatDiv);
  }
});
