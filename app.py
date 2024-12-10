# Flask is so GOATED
from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    url_for,
)
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import os
from bson import ObjectId
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    login_required,
    logout_user,
    current_user,
)
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, emit
import certifi
import uuid
import datetime
import jwt
from flask_mail import Mail, Message
from quantum_safe_encryption import QuantumSafeEncryption

# Initialize the encryption class
encryption = QuantumSafeEncryption(key_length=256)

# Generate a random key
key = encryption.generate_key()

KEY_FILE = "encryption_key.txt"


def save_key(qkey):
    print("Dumping the key: ", qkey)
    with open(KEY_FILE, "w") as f:
        f.write(qkey)


def load_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "r") as f:
            return f.readline().strip()
    return None


def reencrypt_messages(old_key, new_key):
    messages = db.messages.find({})  # Fetch all messages

    for msg in messages:
        try:
            # Decrypt with old key
            decrypted_content = encryption.decrypt(msg["content"], old_key)
            print(f"Decrypted content: {decrypted_content}")

            # Re-encrypt with new key
            reencrypted_content = encryption.encrypt(decrypted_content, new_key)

            # Update in database
            db.messages.update_one(
                {"_id": msg["_id"]}, {"$set": {"content": reencrypted_content}}
            )
        except Exception as e:
            print(f"Failed to re-encrypt message {msg['_id']}: {e}")


load_dotenv()
app = Flask(__name__, static_url_path="/static", static_folder="static")
client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["q-secure"]
cred_collection = db.credentials  # Collection for storing user credentials
app.secret_key = os.getenv("SECRET_KEY")

# CORS for Sockets
CORS(
    app,
    origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://192.168.0.214:8000",
    ],
)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login_page"

# Flask-Mail configuration
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")

mail = Mail(app)
socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "http://127.0.0.1:8000",
        "http://192.168.0.214:8000",
        "http://localhost:8000",
    ],
)


class User(UserMixin):
    def __init__(self, user_id, username, email):
        self.id = user_id
        self.username = username
        self.email = email

    def get_id(self):
        return self.id


@login_manager.unauthorized_handler
def unauthorized():
    # Redirect unauthorized users to DENIED
    return render_template("access-denied.html")


@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = (
        "no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0"
    )
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@login_manager.user_loader
def load_user(user_id):
    user = cred_collection.find_one({"_id": ObjectId(user_id)})
    if user:
        return User(user["_id"], user["username"], user["email"])
    return None


@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


@app.route("/register", methods=["GET"])
def register_page():
    return render_template("register.html")


@app.route("/", methods=["GET"])
def intro():
    return render_template("intro.html")


@app.route("/signin", methods=["POST"])
def signin():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = cred_collection.find_one({"username": username})
    if user and check_password_hash(user["password"], password):
        user_obj = User(str(user["_id"]), user["username"], user["email"])
        login_user(user_obj)
        return jsonify({"status": "correct"})
    else:
        return jsonify({"status": "incorrect"})


@app.route("/forgot_password_page", methods=["GET"])
def forgot_password_page():
    return render_template("forgot_password.html")


@app.route("/forgot_password", methods=["POST"])
def handle_forgot_password():
    data = request.get_json()
    email = data.get("email")
    user = cred_collection.find_one({"email": email})
    if user:
        token = jwt.encode(
            {
                "email": email,
                "exp": datetime.datetime.now(datetime.timezone.utc)
                + datetime.timedelta(hours=1),
            },
            app.config["SECRET_KEY"],
        )
        reset_link = url_for("reset_password_page", token=token, _external=True)
        msg = Message(
            "Password Reset Request",
            sender=os.getenv("MAIL_USERNAME"),
            recipients=[email],
        )  # Add sender later
        msg.body = f"Please click the link to reset your password: {reset_link}"
        mail.send(msg)
        return jsonify(
            {
                "status": "success",
                "message": "Please check you email for instructions to reset your password.",
            }
        )
    else:
        return jsonify(
            {"status": "error", "message": "Could not find an account with this email."}
        )


@app.route("/reset_password/<token>", methods=["GET", "POST"])
def reset_password_page(token):
    try:
        data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        email = data["email"]
    except jwt.ExpiredSignatureError:
        return jsonify({"status": "error", "message": "The reset link has expired."})
    except jwt.InvalidTokenError:
        return jsonify({"status": "error", "message": "Invalid reset link."})

    if request.method == "POST":
        new_password = request.get_json().get("password")
        hashed_password = generate_password_hash(new_password)
        cred_collection.update_one(
            {"email": email}, {"$set": {"password": hashed_password}}
        )
        return jsonify(
            {"status": "success", "message": "Password has been reset successfully."}
        )
    else:
        return render_template("reset_password.html")


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # Check if username or email already exists
    if cred_collection.find_one({"username": username}):
        return jsonify({"status": "error", "message": "Username already exists"})
    if cred_collection.find_one({"email": email}):
        return jsonify({"status": "error", "message": "Email already exists"})

    hashed_password = generate_password_hash(password)
    cred_collection.insert_one(
        {"username": username, "email": email, "password": hashed_password}
    )

    return jsonify({"status": "success"})


@app.route("/signup-complete")
def signup_complete():
    return render_template("signup_complete.html")


@app.route("/user/<username>")
@login_required
def user(username):
    # Ensure the current user is accessing their own messages
    if current_user.username != username:
        return render_template("access-denied.html")

    # Fetch distinct users the current user has messaged with
    users_chatted = db.messages.aggregate(
        [
            {
                "$match": {
                    "$or": [
                        {"sender_id": current_user.id},
                        {"receiver_id": current_user.id},
                    ]
                }
            },
            {
                "$group": {
                    "_id": {
                        "$cond": [
                            {"$eq": ["$sender_id", current_user.id]},
                            "$receiver_id",
                            "$sender_id",
                        ]
                    }
                }
            },
        ]
    )

    # Fetch messages for the current user and each distinct chat partner
    message_data = {}
    chat_partner_usernames = {}  # Add a dictionary to store chat partner usernames

    for user in users_chatted:
        chat_partner_id = user["_id"]
        messages = db.messages.find(
            {
                "$or": [
                    {"sender_id": current_user.id, "receiver_id": chat_partner_id},
                    {"sender_id": chat_partner_id, "receiver_id": current_user.id},
                ]
            }
        ).sort("timestamp", 1)

        # Get the chat partner's username
        chat_partner = db.credentials.find_one({"_id": ObjectId(chat_partner_id)})
        chat_partner_usernames[chat_partner_id] = chat_partner[
            "username"
        ]  # Store username

        message_list = []
        for msg in messages:
            message_list.append(
                {
                    "sender_id": msg["sender_id"],
                    "receiver_id": msg["receiver_id"],
                    "content": encryption.decrypt(msg["content"], new_key),
                    "timestamp": msg["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
        message_data[chat_partner_id] = message_list

    # Check if there are messages for any user
    has_messages = bool(message_data)

    return render_template(
        "index.html",
        messages=message_data,
        username=username,
        has_messages=has_messages,
        chat_partner_usernames=chat_partner_usernames,  # Pass the usernames to the template
    )


@app.route("/get_chat/<chat_partner_id>", methods=["GET"])
@login_required
def get_chat(chat_partner_id):
    # Fetch messages between the current user and the chat partner
    messages = db.messages.find(
        {
            "$or": [
                {
                    "sender_id": current_user.id,
                    "receiver_id": ObjectId(chat_partner_id),
                },
                {
                    "sender_id": ObjectId(chat_partner_id),
                    "receiver_id": current_user.id,
                },
            ]
        }
    ).sort("timestamp", 1)

    message_list = []
    for msg in messages:
        message_list.append(
            {
                "message_id": msg["message_id"],
                "sender_id": str(msg["sender_id"]),
                "receiver_id": str(msg["receiver_id"]),
                "content": encryption.decrypt(msg["content"], new_key),
                "timestamp": msg["timestamp"].strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
    # Retrieve the chat partner's username
    chat_partner = db.credentials.find_one({"_id": ObjectId(chat_partner_id)})

    return jsonify(
        {
            "status": "success",
            "messages": message_list,
            "username": chat_partner["username"],
        }
    )


@app.route("/search_users", methods=["GET"])
@login_required
def search_users():
    query = request.args.get("query")  # Get the search query
    exclude_users = request.args.get(
        "exclude_users"
    )  # Get the list of users to exclude
    exclude_user_ids = exclude_users.split(",") if exclude_users else []
    exclude_user_ids = [ObjectId(user_id) for user_id in exclude_user_ids]

    if query:
        # Search for users in the database based on the query
        users = db.credentials.find(
            {
                "username": {"$regex": query, "$options": "i"},
                "_id": {
                    "$nin": exclude_user_ids
                },  # Exclude users already in conversations
            }
        )

        results = [
            {"username": user["username"], "id": str(user["_id"])}
            for user in users
            if user["username"] != current_user.username
        ]
    else:
        results = []

    return jsonify(results)


@app.route("/usersettings/<username>", methods=["GET"])
def user_settings(username):
    return render_template("settings.html", username=username)


@app.route("/logout", methods=["GET"])
def logout_user_custom():
    logout_user()
    return jsonify({"status": "success"}), 200


@socketio.on("join_chat")
def on_join_chat(data):
    # Data contains the IDs of both users involved in the chat
    current_user_id = str(current_user.id)
    chat_partner_id = data["chat_partner_id"]

    # Create a unique room name based on user IDs
    room_name = f"chat_{min(current_user_id, chat_partner_id)}_{max(current_user_id, chat_partner_id)}"

    # Leave all existing rooms and join the new room
    leave_room(current_user_id)  # Ensure the user leaves their unique personal room
    join_room(room_name)
    print(f"User {current_user_id} joined room {room_name}")

    emit("joined_room", {"room": room_name}, room=current_user_id)


@socketio.on("send_message")
def handle_send_message(data):
    # Extract data
    receiver_id = data["receiver_id"]
    content = data["content"]

    encrypted_message = encryption.encrypt(content, new_key)

    # Create a unique room name for the chat
    current_user_id = str(current_user.id)
    room_name = (
        f"chat_{min(current_user_id, receiver_id)}_{max(current_user_id, receiver_id)}"
    )

    # Save the message in the database
    new_message = {
        "message_id": str(uuid.uuid4()),
        "sender_id": current_user.id,
        "receiver_id": ObjectId(receiver_id),
        "content": encrypted_message,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
    }

    # Check if this is the first message between the users
    existing_message = db.messages.find_one(
        {
            "$or": [
                {"sender_id": current_user.id, "receiver_id": ObjectId(receiver_id)},
                {"sender_id": ObjectId(receiver_id), "receiver_id": current_user.id},
            ]
        }
    )

    is_first_time_message = existing_message is None

    if is_first_time_message:
        socketio.emit(
            "new_chat",
            {
                "id": str(current_user.id),
                "username": current_user.username,
                "rec_id": receiver_id,
            },
        )

    db.messages.insert_one(new_message)

    decrypted_message = encryption.decrypt(encrypted_message, new_key)

    message_data = {
        "message_id": new_message["message_id"],
        "sender_id": str(current_user.id),  # Convert sender_id to string
        "receiver_id": str(receiver_id),  # Convert receiver_id to string
        "content": decrypted_message,
        "timestamp": new_message["timestamp"].isoformat(),
    }
    emit("new_message", message_data, room=room_name)
    socketio.emit("update_message", message_data)


@app.route("/delete_chat/<username>", methods=["POST"])
@login_required
def delete_chat(username):
    # Find the user by username
    user = db.credentials.find_one({"username": username})

    # If the user exists and the current user is allowed to delete the chat
    if user:
        chat_partner_id = str(user["_id"])

        # Delete all messages between the current user and the chat partner
        db.messages.delete_many(
            {
                "$or": [
                    {
                        "sender_id": current_user.id,
                        "receiver_id": ObjectId(chat_partner_id),
                    },
                    {
                        "sender_id": ObjectId(chat_partner_id),
                        "receiver_id": current_user.id,
                    },
                ]
            }
        )
        socketio.emit(
            "chat_deleted",
            {"idToRemove": str(current_user.id)},
        )
        return jsonify({"status": "success", "message": "Chat deleted successfully."})

    return jsonify({"status": "error", "message": "User not found."})


if __name__ == "__main__":
    old_key = load_key()
    print("Old Key: ", old_key)
    new_key = encryption.generate_key()
    print("New Key: ", new_key)
    if old_key:
        reencrypt_messages(old_key, new_key)
    save_key(new_key)
    socketio.run(app, port=8000, debug=True, host="0.0.0.0")
