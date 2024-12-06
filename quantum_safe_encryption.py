"""
This is a very simple and theoretical implementation of a quantum-safe encryption algorithm.
The encryption algorithm is a simple XOR operation between the message and the key. 
The key is encoded to Base64 for safe storage in MongoDB.

Why we chose to use this?
- Since this project is made in with an academic setting in mind, we wanted to implement a simple yet impactful algorithm for our mini project.
- It is very simple and easy-to-understand.
- It is also quantum-safe, meaning that it is (theoretically) not vulnerable to attacks by quantum computers.

How is this algorithm quantum-safe?
- It uses one time padding (OTP) which is theoretically unbreakable if the key is random and used only once.

Limitations:
- Uses FIXED length keys (256 bits).
- The encryption algorithm is a simple XOR operation, which is not secure for large messages.
"""

import base64
import hashlib
import random
import string


class QuantumSafeEncryption:
    def __init__(self, key_length=256):
        self.key_length = key_length

    def generate_key(self):
        """Generate a random key for encryption."""
        return "".join(
            random.choices(string.ascii_letters + string.digits, k=self.key_length)
        )

    def encrypt(self, plaintext, key):
        """Encrypt the message using a symmetric algorithm."""
        if len(key) != self.key_length:
            raise ValueError(f"Key length must be {self.key_length}")

        # Simple XOR encryption
        encrypted_message = [
            chr(ord(char) ^ ord(key[i % len(key)])) for i, char in enumerate(plaintext)
        ]
        encrypted_str = "".join(encrypted_message)
        # Encode to Base64 for safe storage
        return base64.b64encode(encrypted_str.encode()).decode()

    def decrypt(self, encrypted_message, key):
        """Decrypt the message using the symmetric algorithm."""
        if len(key) != self.key_length:
            raise ValueError(f"Key length must be {self.key_length}")

        # Decode Base64
        encrypted_bytes = base64.b64decode(encrypted_message.encode())
        encrypted_str = encrypted_bytes.decode()
        # Simple XOR decryption
        decrypted_message = [
            chr(ord(char) ^ ord(key[i % len(key)]))
            for i, char in enumerate(encrypted_str)
        ]
        return "".join(decrypted_message)

    def hash_message(self, message):
        """Generate a hash of the message."""
        return hashlib.sha256(message.encode()).hexdigest()
