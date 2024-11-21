from flask import Flask, render_template
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__, static_url_path="/static", static_folder = "static")
client = MongoClient(os.getenv("MONGO_URI"))
db = client["q-secure"]
collection = db.credentials

@app.route("/login", methods = ["GET"])
def login_page():
  return render_template("login.html")

@app.route("/", methods = ["GET"])
def home():
  return render_template("index.html")

@app.route("/register", methods = ["GET"])
def register_page():
  return render_template("register.html")

if __name__ == "__main__":
  app.run(port = 3000, debug=True)
