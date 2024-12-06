# Q-Secure Chat
This was made for my college Mini Project for the 5th Semester.
Modern Chat Applications use End-to-End Encrytption, which typically uses algorithms like RSA, which can be broken with enough quantum computing power. <br> 
<a href="https://github.com/shreyas-078/quantum-shors-rsa">Refer this Git Repo to know how.</a> <br> <br>
So I decided to build a chat client that can completely resist such attacks.

# Focus
My focus was to build a chat client that could theoretically resist quantum attacks breaking end to end encryption algorithms in the long run, and while I could not achieve that to the full extent, I did make a decent enough version for academic purposes.

# How to Run
You would require an App Password from google for the mailing features for the `Forgot Password` Section to work. <br>
<a href="https://support.google.com/accounts/answer/185833?hl=en">Refer this Google article to get your own App Password.</a>

1. Clone the repo with the command `git clone https://github.com/shreyas-078/q-secure-chat`.

2. Navigate to the project folder and create a `.env` file with the following fields: <br><br>
   a. `MONGO_URI` <br>
   b. `SECRET_KEY` <br>
   c. `MAIL_USERNAME` <br>
   d. `MAIL_PASSWORD` <br>

3. Install the necessary packages to run the application by running `pip install -r requirents.txt`.
4. Run the app by running the command `python app.py`
5. Open your browser and navigate to `https://localhost:8000`

# Future Developments
I will probably not be continuing development for this application because I feel like there is a really huge computational gap between quantum computers actually taking over the algorithms like RSA or AES. Until we get quantum computers with at least 20,000 qubits.
And also, in this project, I do not use end-to-end encryption, so while I am storing encrypted messages in the database, they still get decrypted at the backend and freely flow thereafter. <br>
## Why did I do that? 
Because I would need to maintain separate public private key pairs for every user that ONE user chats with. It is very difficult to implement under the short timeframe of 1.5 months which we were given to finish this project.

# Limitations 
1. This is a symmetric encryption algorithm, for the reasons mentioned above.
2. The quantum safe algorithm implemented is a One Time Padding (OTP) XOR encryption. In theory that would be quantum safe, but my implementation is very low level.
3. The key size is fixed.

# Contributing

Contributions are welcome! If you have suggestions for improvements or find any issues, please create an issue or submit a pull request.

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new pull request.
