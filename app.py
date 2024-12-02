from flask import Flask, render_template, request, jsonify, redirect, url_for
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
import certifi
import uuid
import datetime
import jwt
from flask_mail import Mail, Message

load_dotenv()
app = Flask(__name__, static_url_path="/static", static_folder="static")
client = MongoClient(os.getenv("MONGO_URI"), tlsCAFile=certifi.where())
db = client["q-secure"]
cred_collection = db.credentials
app.secret_key = os.getenv("SECRET_KEY")

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login_page"

# Flask-Mail configuration
app.config["MAIL_SERVER"] = "smtp.example.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = ""  # Add this later
app.config["MAIL_PASSWORD"] = ""  # Add this later

mail = Mail(app)


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
            "Password Reset Request", sender="", recipients=[email]
        )  # Add sender later
        msg.body = f"Please click the link to reset your password: {reset_link}"
        mail.send(msg)
        return jsonify(
            {"status": "success", "message": "Password reset link sent to your email."}
        )
    else:
        return jsonify({"status": "error", "message": "No Accounts use this email."})


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

    return render_template("reset_password.html", token=token)


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

        message_list = []
        for msg in messages:
            message_list.append(
                {
                    "sender_id": msg["sender_id"],
                    "receiver_id": msg["receiver_id"],
                    "content": msg["content"],
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
    )


@app.route("/search_users", methods=["GET"])
@login_required
def search_users():
    query = request.args.get("query")  # Get the search query
    if query:
        # Search for users in the database based on the query
        users = db.credentials.find({"username": {"$regex": query, "$options": "i"}})
        results = [
            (
                {"username": user["username"]}
                if user["username"] != current_user.username
                else None
            )
            for user in users
        ]
        results
    else:
        results = []

    return jsonify(results)


@app.route("/send_message", methods=["POST"])
@login_required
def send_message():
    data = request.get_json()
    content = data.get("content")
    receiver_id = data.get("receiver_id")

    # Save the message in MongoDB
    new_message = {
        "message_id": str(uuid.uuid4()),
        "sender_id": current_user.id,
        "receiver_id": receiver_id,
        "content": content,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
    }
    db.messages.insert_one(new_message)

    return jsonify({"status": "success", "message": "Message sent!"})


@app.route("/user/settings/<username>", methods=["GET"])
def user_settings(username):
    return render_template("settings.html", username=username)


@app.route("/logout", methods=["GET"])
def logout_user_custom():
    logout_user()
    return jsonify({"status": "success"}), 200


if __name__ == "__main__":
    app.run(port=3000, debug=True)
